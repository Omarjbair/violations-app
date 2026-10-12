import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { State, StateDocument } from './schemas/state.schema.js';
import { CreateStateDto } from './dto/create-state.dto.js';
import { UpdateStateDto } from './dto/update-state.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';

@Injectable()
export class StatesService {
    constructor(
        @InjectModel(State.name) private stateModel: Model<State>,
    ) {}

    async create(dto: CreateStateDto): Promise<StateDocument> {
        const existing = await this.stateModel.findOne({ name: dto.name });

        if (existing) {
            throw new ConflictException('اسم المحافظة مستخدم مسبقاً');
        }

        return this.stateModel.create(dto);
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
        // TODO: Dont Delete if there are addresses linked to this state

        const result = await this.stateModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        if (result.matchedCount === 0) {
            throw new NotFoundException('المحافظة غير موجودة');
        }
    }
}