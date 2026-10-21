import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Citizen, CitizenDocument } from './schemas/citizen.schema.js';
import { Address } from '../addresses/schemas/address.schema.js';
import { CreateCitizenDto } from './dto/create-citizen.dto.js';
import { UpdateCitizenDto } from './dto/update-citizen.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';

const NATIONAL_ID_TAKEN = 'الرقم الوطني مستخدم مسبقاً';
const NOT_FOUND = 'المواطن غير موجود';
const ADDRESS_NOT_FOUND = 'العنوان غير موجود';

function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: number }).code === 11000
    );
}

@Injectable()
export class CitizensService {
    constructor(
        @InjectModel(Citizen.name) private citizenModel: Model<Citizen>,
        @InjectModel(Address.name) private addressModel: Model<Address>,
    ) {}

    async create(dto: CreateCitizenDto): Promise<CitizenDocument> {
        await this.assertAddressExists(dto.address_id);

        const existing = await this.citizenModel.exists({
            national_id: dto.national_id,
            deleted_at: null,
        });

        if (existing) throw new ConflictException(NATIONAL_ID_TAKEN);

        try {
            return await this.citizenModel.create(dto);
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(NATIONAL_ID_TAKEN);
            }
            throw error;
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<Citizen>> {
        return paginate(this.citizenModel, { deleted_at: null }, query, {
            created_at: -1,
        });
    }

    async findById(id: string): Promise<CitizenDocument> {
        const citizen = await this.citizenModel
            .findOne({ _id: id, deleted_at: null })
            .populate({
                path: 'address_id',
                populate: { path: 'state_id' },
            });

        if (!citizen) throw new NotFoundException(NOT_FOUND);

        return citizen;
    }

    async update(id: string, dto: UpdateCitizenDto): Promise<CitizenDocument> {
        const exists = await this.citizenModel.exists({ _id: id, deleted_at: null });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        if (dto.national_id) {
            const duplicate = await this.citizenModel.exists({
                national_id: dto.national_id,
                _id: { $ne: id },
                deleted_at: null,
            });

            if (duplicate) throw new ConflictException(NATIONAL_ID_TAKEN);
        }

        if (dto.address_id) {
            await this.assertAddressExists(dto.address_id);
        }

        try {
            const updated = await this.citizenModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                dto,
                { new: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            return updated;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(NATIONAL_ID_TAKEN);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const result = await this.citizenModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        if (result.matchedCount === 0) throw new NotFoundException(NOT_FOUND);
    }

    private async assertAddressExists(addressId: string): Promise<void> {
        const address = await this.addressModel.exists({
            _id: addressId,
            deleted_at: null,
        });

        if (!address) throw new NotFoundException(ADDRESS_NOT_FOUND);
    }
}