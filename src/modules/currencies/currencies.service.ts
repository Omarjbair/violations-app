import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Currency, CurrencyDocument } from './schemas/currency.schema.js';
import { CreateCurrencyDto } from './dto/create-currency.dto.js';
import { UpdateCurrencyDto } from './dto/update-currency.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';

const NOT_FOUND = 'العملة غير موجودة';
const CODE_TAKEN = 'رمز العملة مستخدم مسبقاً';
const NAME_TAKEN = 'اسم العملة مستخدم مسبقاً';

@Injectable()
export class CurrenciesService {
    constructor(
        @InjectModel(Currency.name)
        private currencyModel: Model<Currency>,
    ) {}

    async create(dto: CreateCurrencyDto): Promise<CurrencyDocument> {
        const code = dto.code.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name });

        try {
            return await this.currencyModel.create({
                code,
                name: dto.name,
            });
        } catch (error) {
            this.mapDuplicateError(error);
        }
    }

    async findAll(query: PaginationQueryDto): Promise<Paginated<Currency>> {
        return paginate(this.currencyModel, { deleted_at: null }, query, {
            code: 1,
        });
    }

    async findById(id: string): Promise<CurrencyDocument> {
        const currency = await this.currencyModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!currency) throw new NotFoundException(NOT_FOUND);

        return currency;
    }

    async update(
        id: string,
        dto: UpdateCurrencyDto,
    ): Promise<CurrencyDocument> {
        const exists = await this.currencyModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const code = dto.code?.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name }, id);

        const update: Record<string, unknown> = {};

        if (code) update.code = code;
        if (dto.name !== undefined) update.name = dto.name;

        try {
            const updated = await this.currencyModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                update,
                { new: true, runValidators: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            return updated;
        } catch (error) {
            this.mapDuplicateError(error);
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.currencyModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        await this.currencyModel.updateOne(
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

        const duplicate = await this.currencyModel.findOne(filter);
        if (!duplicate) return;

        if (values.code && duplicate.code === values.code) {
            throw new ConflictException(CODE_TAKEN);
        }

        throw new ConflictException(NAME_TAKEN);
    }

    private mapDuplicateError(error: unknown): never {
        if (isDuplicateKeyError(error)) {
            const keyPattern =
                (error as { keyPattern?: Record<string, number> }).keyPattern ??
                {};

            if (keyPattern.name) {
                throw new ConflictException(NAME_TAKEN);
            }

            throw new ConflictException(CODE_TAKEN);
        }

        throw error;
    }
}
