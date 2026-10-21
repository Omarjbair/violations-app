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

@Injectable()
export class StatesService {
    constructor(
        @InjectModel(State.name) private stateModel: Model<State>,
        @InjectModel(Address.name) private addressModel: Model<Address>,
    ) {}

    async create(createStateDto: CreateStateDto): Promise<StateDocument> {
        const existing = await this.stateModel.findOne({
            name: createStateDto.name,
            deleted_at: null,
        });

        if (existing) {
            throw new ConflictException('اسم المحافظة مستخدم مسبقاً');
        }

        return this.stateModel.create(createStateDto);
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<State>> {
        return paginate(this.stateModel, { deleted_at: null }, query, { name: 1 });
    }

    async findById(id: string): Promise<StateDocument> {
        const state = await this.stateModel.findOne({ _id: id, deleted_at: null });

        if (!state) throw new NotFoundException('المحافظة غير موجودة');

        return state;
    }

    async update(id: string, updateStateDto: UpdateStateDto): Promise<StateDocument> {
        if (updateStateDto.name) {
            const existing = await this.stateModel.findOne({
                name: updateStateDto.name,
                _id: { $ne: id },
                deleted_at: null, //
            });

            if (existing) {
                throw new ConflictException('اسم المحافظة مستخدم مسبقاً');
            }
        }

        const updated = await this.stateModel.findOneAndUpdate(
            { _id: id, deleted_at: null },
            updateStateDto,
            { new: true },
        );

        if (!updated) throw new NotFoundException('المحافظة غير موجودة');

        return updated;
    }

    async remove(id: string): Promise<void> {
        const session = await this.stateModel.db.startSession();

        try {
            await session.withTransaction(async () => {
                // check if state exist
                const state = await this.stateModel.findOne(
                    { _id: id, deleted_at: null },
                    null,
                    { session },
                );

                if (!state) throw new NotFoundException('المحافظة غير موجودة');

                // check linke addresses
                const linkedAddresses = await this.addressModel.countDocuments(
                    { state: id, deleted_at: null },
                    { session },
                );

                if (linkedAddresses > 0) {
                    throw new ConflictException(
                        'لا يمكن حذف المحافظة لوجود عناوين مرتبطة بها',
                    );
                }

                // 3) soft delete the state
                await this.stateModel.updateOne(
                    { _id: id, deleted_at: null },
                    { deleted_at: new Date() },
                    { session },
                );
            });
            
        } finally {
            await session.endSession();
        }
    }
}