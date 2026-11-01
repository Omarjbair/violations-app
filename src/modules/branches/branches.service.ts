import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema.js';
import { User } from '../users/schemas/user.schema.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { AddressesService } from '../addresses/addresses.service.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';

const NOT_FOUND = 'الفرع غير موجود';
const CODE_TAKEN = 'رمز الفرع مستخدم مسبقاً';
const NAME_TAKEN = 'اسم الفرع مستخدم مسبقاً';
const HAS_USERS = 'لا يمكن حذف الفرع لوجود مستخدمين مرتبطين به';

@Injectable()
export class BranchesService {
    constructor(
        @InjectModel(Branch.name) private branchModel: Model<Branch>,
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly addressesService: AddressesService,
    ) {}

    async create(dto: CreateBranchDto): Promise<BranchDocument> {
        await this.addressesService.findById(dto.address_id);

        const code = dto.code.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name });

        try {
            const branch = await this.branchModel.create({
                code,
                name: dto.name,
                phone: dto.phone,
                address_id: dto.address_id,
            });

            return await branch.populate({
                path: 'address_id',
                populate: { path: 'state_id', select: 'name' },
            });
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(CODE_TAKEN);
            }
            throw error;
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<Branch>> {
        return paginate(this.branchModel, { deleted_at: null }, query, {
            code: 1,
        });
    }

    async findById(id: string): Promise<BranchDocument> {
        const branch = await this.branchModel
            .findOne({ _id: id, deleted_at: null })
            .populate({
                path: 'address_id',
                populate: { path: 'state_id', select: 'name' },
            });

        if (!branch) throw new NotFoundException(NOT_FOUND);

        return branch;
    }

    async update(id: string, dto: UpdateBranchDto): Promise<BranchDocument> {
        const exists = await this.branchModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        if (dto.address_id) {
            await this.addressesService.findById(dto.address_id);
        }

        const code = dto.code?.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name }, id);

        const update: Record<string, unknown> = {};

        if (code) update.code = code;
        if (dto.name !== undefined) update.name = dto.name;
        if (dto.phone !== undefined) update.phone = dto.phone;
        if (dto.address_id !== undefined) update.address_id = dto.address_id;

        try {
            const updated = await this.branchModel
                .findOneAndUpdate({ _id: id, deleted_at: null }, update, {
                    new: true,
                    runValidators: true,
                })
                .populate({
                    path: 'address_id',
                    populate: { path: 'state_id', select: 'name' },
                });

            if (!updated) throw new NotFoundException(NOT_FOUND);

            return updated;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(CODE_TAKEN);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.branchModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const linkedUsers = await this.userModel.countDocuments({
            branch_id: id,
            deleted_at: null,
        });

        if (linkedUsers > 0) throw new ConflictException(HAS_USERS);

        await this.branchModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }

    private async assertUnique(
        values: { code?: string; name?: string },
        excludeId?: string,
    ): Promise<void> {
        const or: Record<string, string>[] = [];

        if (values.code) or.push({ code: values.code });
        if (values.name) or.push({ name: values.name });
        if (or.length === 0) return;

        const filter: Record<string, unknown> = {
            deleted_at: null,
            $or: or,
        };

        if (excludeId) filter._id = { $ne: excludeId };

        const duplicate = await this.branchModel.findOne(filter);
        if (!duplicate) return;

        if (values.code && duplicate.code === values.code) {
            throw new ConflictException(CODE_TAKEN);
        }

        throw new ConflictException(NAME_TAKEN);
    }
}
