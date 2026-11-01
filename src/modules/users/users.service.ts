import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { BranchesService } from '../branches/branches.service.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';

const NOT_FOUND = 'المستخدم غير موجود';
const USERNAME_TAKEN = 'اسم المستخدم مستخدم مسبقاً';
const PHONE_TAKEN = 'رقم الهاتف مستخدم مسبقاً';
const IDENTITY_TAKEN = 'اسم المستخدم أو رقم الهاتف مستخدم مسبقاً';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly branchesService: BranchesService,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<UserDocument> {
        const existing = await this.userModel.findOne({
            deleted_at: null,
            $or: [
                { username: createUserDto.username },
                { phone: createUserDto.phone },
            ],
        });

        if (existing) throw new ConflictException(IDENTITY_TAKEN);

        if (createUserDto.branch_id) {
            await this.branchesService.findById(createUserDto.branch_id);
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        try {
            const created = new this.userModel({
                username: createUserDto.username,
                phone: createUserDto.phone,
                password: hashedPassword,
                first_name: createUserDto.first_name,
                last_name: createUserDto.last_name,
                branch_id: createUserDto.branch_id,
                role: createUserDto.role,
            });

            return await created.save();
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(IDENTITY_TAKEN);
            }
            throw error;
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<User>> {
        return paginate(this.userModel, { deleted_at: null }, query, {
            created_at: -1,
        });
    }

    async findById(id: string): Promise<UserDocument> {
        const user = await this.userModel
            .findOne({ _id: id, deleted_at: null })
            .populate('branch_id', 'code name phone');

        if (!user) throw new NotFoundException(NOT_FOUND);

        return user;
    }

    async update(
        id: string,
        updateUserDto: UpdateUserDto,
    ): Promise<UserDocument> {
        const exists = await this.userModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        if (updateUserDto.branch_id) {
            await this.branchesService.findById(updateUserDto.branch_id);
        }

        await this.assertUnique(
            {
                username: updateUserDto.username,
                phone: updateUserDto.phone,
            },
            id,
        );

        const update: Record<string, unknown> = {};

        if (updateUserDto.username !== undefined) {
            update.username = updateUserDto.username;
        }
        if (updateUserDto.phone !== undefined) {
            update.phone = updateUserDto.phone;
        }
        if (updateUserDto.first_name !== undefined) {
            update.first_name = updateUserDto.first_name;
        }
        if (updateUserDto.last_name !== undefined) {
            update.last_name = updateUserDto.last_name;
        }
        if (updateUserDto.branch_id !== undefined) {
            update.branch_id = updateUserDto.branch_id;
        }
        if (updateUserDto.role !== undefined) {
            update.role = updateUserDto.role;
        }

        try {
            const updated = await this.userModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                update,
                { new: true, runValidators: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            return updated;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(IDENTITY_TAKEN);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.userModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        await this.userModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }

    findForLogin(login: string) {
        return this.userModel
            .findOne({
                $or: [{ username: login }, { phone: login }],
                deleted_at: null,
            })
            .select('+password');
    }

    findWithRefreshHash(id: string) {
        return this.userModel
            .findOne({ _id: id, deleted_at: null })
            .select('+refresh_token_hash');
    }

    async setRefreshTokenHash(id: string, hash: string | null) {
        await this.userModel.updateOne(
            { _id: id },
            { refresh_token_hash: hash },
        );
    }

    private async assertUnique(
        values: { username?: string; phone?: string },
        excludeId?: string,
    ): Promise<void> {
        const or: Record<string, string>[] = [];

        if (values.username) or.push({ username: values.username });
        if (values.phone) or.push({ phone: values.phone });
        if (or.length === 0) return;

        const filter: Record<string, unknown> = {
            deleted_at: null,
            $or: or,
        };

        if (excludeId) filter._id = { $ne: excludeId };

        const duplicate = await this.userModel.findOne(filter);
        if (!duplicate) return;

        if (values.username && duplicate.username === values.username) {
            throw new ConflictException(USERNAME_TAKEN);
        }

        throw new ConflictException(PHONE_TAKEN);
    }
}
