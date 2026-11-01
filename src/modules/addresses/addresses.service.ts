import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema.js';
import { Branch } from '../branches/schemas/branch.schema.js';
import { Citizen } from '../citizens/schemas/citizen.schema.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { StatesService } from '../states/states.service.js';
import { paginate } from '../../common/utils/pagination.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';

const NOT_FOUND = 'العنوان غير موجود';
const HAS_BRANCHES = 'لا يمكن حذف العنوان لوجود فروع مرتبطة به';
const HAS_CITIZENS = 'لا يمكن حذف العنوان لوجود مواطنين مرتبطين به';

@Injectable()
export class AddressesService {
    constructor(
        @InjectModel(Address.name) private addressModel: Model<Address>,
        @InjectModel(Branch.name) private branchModel: Model<Branch>,
        @InjectModel(Citizen.name) private citizenModel: Model<Citizen>,
        private readonly statesService: StatesService,
    ) {}

    async create(createAddressDto: CreateAddressDto): Promise<AddressDocument> {
        await this.statesService.findById(createAddressDto.state_id);

        const created = await this.addressModel.create({
            state_id: createAddressDto.state_id,
            city: createAddressDto.city,
            street: createAddressDto.street,
        });

        return await created.populate('state_id', 'name');
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<Address>> {
        return paginate(this.addressModel, { deleted_at: null }, query, {
            created_at: -1,
        });
    }

    async findById(id: string): Promise<AddressDocument> {
        const address = await this.addressModel
            .findOne({ _id: id, deleted_at: null })
            .populate('state_id', 'name');

        if (!address) throw new NotFoundException(NOT_FOUND);

        return address;
    }

    async update(id: string, dto: UpdateAddressDto): Promise<AddressDocument> {
        const exists = await this.addressModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        if (dto.state_id) {
            await this.statesService.findById(dto.state_id);
        }

        const update: Record<string, unknown> = {};

        if (dto.state_id !== undefined) update.state_id = dto.state_id;
        if (dto.city !== undefined) update.city = dto.city;
        if (dto.street !== undefined) update.street = dto.street;

        const updated = await this.addressModel
            .findOneAndUpdate({ _id: id, deleted_at: null }, update, {
                new: true,
                runValidators: true,
            })
            .populate('state_id', 'name');

        if (!updated) throw new NotFoundException(NOT_FOUND);

        return updated;
    }

    async remove(id: string): Promise<void> {
        const exists = await this.addressModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const [linkedBranches, linkedCitizens] = await Promise.all([
            this.branchModel.countDocuments({
                address_id: id,
                deleted_at: null,
            }),
            this.citizenModel.countDocuments({
                address_id: id,
                deleted_at: null,
            }),
        ]);

        if (linkedBranches > 0) throw new ConflictException(HAS_BRANCHES);
        if (linkedCitizens > 0) throw new ConflictException(HAS_CITIZENS);

        await this.addressModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }
}
