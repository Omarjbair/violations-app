import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    ViolationType,
    ViolationTypeDocument,
} from './schemas/violation-type.schema.js';
import { CreateViolationTypeDto } from './dto/create-violation-type.dto.js';
import { UpdateViolationTypeDto } from './dto/update-violation-type.dto.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { paginate } from '../../common/utils/pagination.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';
import { RedisService } from '../../redis/redis.service.js';

const NOT_FOUND = 'نوع المخالفة غير موجود';
const CODE_TAKEN = 'رمز نوع المخالفة مستخدم مسبقاً';
const NAME_TAKEN = 'اسم نوع المخالفة مستخدم مسبقاً';

@Injectable()
export class ViolationTypesService {
    constructor(
        @InjectModel(ViolationType.name)
        private violationTypeModel: Model<ViolationType>,
        private readonly redis: RedisService,
    ) {}

    async create(dto: CreateViolationTypeDto): Promise<ViolationTypeDocument> {
        const code = dto.code.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name });

        try {
            const violationType = await this.violationTypeModel.create({
                code,
                name: dto.name,
                description: dto.description,
                default_fine: dto.default_fine,
                is_active: dto.is_active,
            });

            await this.redis.invalidate('cache:violation-types');

            return violationType;
        } catch (error) {
            this.mapDuplicateError(error);
        }
    }

    async findAll(
        query: PaginationQueryDto,
    ): Promise<Paginated<ViolationType>> {
        return this.redis.getOrSet(
            `cache:violation-types:list:${query.page}:${query.limit}`,
            this.redis.cacheTtl,
            () =>
                paginate(this.violationTypeModel, { deleted_at: null }, query, {
                    code: 1,
                }),
        );
    }

    async findById(id: string): Promise<ViolationTypeDocument> {
        const violationType = await this.violationTypeModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!violationType) throw new NotFoundException(NOT_FOUND);

        return violationType;
    }

    async update(
        id: string,
        dto: UpdateViolationTypeDto,
    ): Promise<ViolationTypeDocument> {
        const exists = await this.violationTypeModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        const code = dto.code?.trim().toUpperCase();
        await this.assertUnique({ code, name: dto.name }, id);

        const update: Record<string, unknown> = {};

        if (code) update.code = code;
        if (dto.name !== undefined) update.name = dto.name;
        if (dto.description !== undefined) update.description = dto.description;
        if (dto.default_fine !== undefined) {
            update.default_fine = dto.default_fine;
        }
        if (dto.is_active !== undefined) update.is_active = dto.is_active;

        try {
            const updated = await this.violationTypeModel.findOneAndUpdate(
                { _id: id, deleted_at: null },
                update,
                { new: true, runValidators: true },
            );

            if (!updated) throw new NotFoundException(NOT_FOUND);

            await this.redis.invalidate('cache:violation-types');

            return updated;
        } catch (error) {
            this.mapDuplicateError(error);
        }
    }

    async remove(id: string): Promise<void> {
        const exists = await this.violationTypeModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        await this.violationTypeModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        await this.redis.invalidate('cache:violation-types');
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

        const duplicate = await this.violationTypeModel.findOne(filter);
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
