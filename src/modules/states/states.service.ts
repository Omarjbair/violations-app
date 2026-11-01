import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from './schemas/state.schema.js';
import { Address } from '../addresses/schemas/address.schema.js';
import { CreateStateDto } from './dto/create-state.dto.js';
import { UpdateStateDto } from './dto/update-state.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';
import { RedisService } from '../../redis/redis.service.js';

const NOT_FOUND = 'المحافظة غير موجودة';
const NAME_TAKEN = 'اسم المحافظة مستخدم مسبقاً';
const HAS_ADDRESSES = 'لا يمكن حذف المحافظة لوجود عناوين مرتبطة بها';

@Injectable()
export class StatesService {
    constructor(
        @InjectModel(State.name) private stateModel: Model<State>,
        @InjectModel(Address.name) private addressModel: Model<Address>,
        private readonly redis: RedisService,
    ) {}

    async create(createStateDto: CreateStateDto): Promise<StateDocument> {
        await this.assertUnique(createStateDto.name);

        try {
            const state = await this.stateModel.create({
                name: createStateDto.name,
            });

            await this.redis.invalidate('cache:states');

            return state;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(NAME_TAKEN);
            }
            throw error;
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<State>> {
        return this.redis.getOrSet(
            `cache:states:list:${query.page}:${query.limit}`,
            this.redis.cacheTtl,
            () =>
                paginate(this.stateModel, { deleted_at: null }, query, {
                    name: 1,
                }),
        );
    }

    async findById(id: string): Promise<StateDocument> {
        const state = await this.stateModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!state) throw new NotFoundException(NOT_FOUND);

        return state;
    }

    async update(
        id: string,
        updateStateDto: UpdateStateDto,
    ): Promise<StateDocument> {
        const exists = await this.stateModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        if (updateStateDto.name !== undefined) {
            await this.assertUnique(updateStateDto.name, id);
        }

        const update: Record<string, unknown> = {};

        if (updateStateDto.name !== undefined) {
            update.name = updateStateDto.name;
        }

        try {
            const updated = await this.stateModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                update,
                { new: true, runValidators: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            await this.redis.invalidate('cache:states');

            return updated;
        } catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException(NAME_TAKEN);
            }
            throw error;
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.stateModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const linkedAddresses = await this.addressModel.countDocuments({
            state_id: id,
            deleted_at: null,
        });

        if (linkedAddresses > 0) throw new ConflictException(HAS_ADDRESSES);

        await this.stateModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        await this.redis.invalidate('cache:states');
    }

    private async assertUnique(
        name: string,
        excludeId?: string,
    ): Promise<void> {
        const filter: Record<string, unknown> = {
            name,
            deleted_at: null,
        };

        if (excludeId) filter._id = { $ne: excludeId };

        const duplicate = await this.stateModel.findOne(filter);

        if (duplicate) throw new ConflictException(NAME_TAKEN);
    }
}
