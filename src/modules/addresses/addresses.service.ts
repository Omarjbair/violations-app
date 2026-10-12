import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { Address, AddressDocument } from './schemas/address.schema.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';
import { StatesService } from '../states/states.service.js';
import { paginate } from '../../common/utils/pagination.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

@Injectable()
export class AddressesService {
    constructor(
        @InjectModel(Address.name) private addressModel: Model<Address>,
        private readonly statesService: StatesService,
    ) {}

    async create(createAddressDto: CreateAddressDto): Promise<AddressDocument> {
        // يرمي 404 إذا المحافظة غير موجودة أو محذوفة
        await this.statesService.findById(createAddressDto.state_id);

        const created = await this.addressModel.create(createAddressDto);

        return created.populate('state_id', 'name');
    }

    async findAll(pagination : PaginationQueryDto) {
        return paginate(
            this.addressModel,
            { deleted_at: null },
            pagination,
            { _id: -1 },
        );
    }

    async findById(id: string): Promise<AddressDocument> {
        const address = await this.addressModel
            .findOne({ _id: id, deleted_at: null })
            .populate('state_id', 'name');

        if (!address) throw new NotFoundException('العنوان غير موجود');
        return address;
    }

    async update(id: string, dto: UpdateAddressDto): Promise<AddressDocument> {
        if (dto.state_id) {
            await this.statesService.findById(dto.state_id);
        }

        const updated = await this.addressModel
            .findOneAndUpdate({ _id: id, deleted_at: null }, dto, { new: true })
            .populate('state_id', 'name');

        if (!updated) throw new NotFoundException('العنوان غير موجود');
        return updated;
    }

    async remove(id: string): Promise<void> {
        // TODO: Dont Delete if there is a branch or user linked to this address
        const result = await this.addressModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        if (result.matchedCount === 0) {
            throw new NotFoundException('العنوان غير موجود');
        }
    }
}