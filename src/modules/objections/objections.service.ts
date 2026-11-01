import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import {
    Objection,
    ObjectionDocument,
    ObjectionStatus,
} from './schemas/objection.schema.js';
import { CreateObjectionDto } from './dto/create-objection.dto.js';
import { UpdateObjectionDto } from './dto/update-objection.dto.js';
import { ReviewObjectionDto } from './dto/review-objection.dto.js';
import { ObjectionsQueryDto } from './dto/objections-query.dto.js';
import {
    Violation,
    ViolationStatus,
} from '../violations/schemas/violation.schema.js';
import { CitizensService } from '../citizens/citizens.service.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';

const NOT_FOUND = 'الاعتراض غير موجود';
const VIOLATION_NOT_FOUND = 'المخالفة غير موجودة';
const VIOLATION_CANCELLED = 'لا يمكن تقديم اعتراض على مخالفة ملغاة';
const PENDING_EXISTS = 'يوجد اعتراض قيد المراجعة على هذه المخالفة';
const NOT_PENDING = 'تمت مراجعة هذا الاعتراض مسبقاً';
const EDIT_REVIEWED = 'لا يمكن تعديل اعتراض تمت مراجعته';

@Injectable()
export class ObjectionsService {
    constructor(
        @InjectModel(Objection.name)
        private objectionModel: Model<Objection>,
        @InjectModel(Violation.name)
        private violationModel: Model<Violation>,
        private readonly citizensService: CitizensService,
    ) {}

    async create(dto: CreateObjectionDto): Promise<ObjectionDocument> {
        const violation = await this.violationModel.findOne({
            _id: dto.violation_id,
            deleted_at: null,
        });

        if (!violation) throw new NotFoundException(VIOLATION_NOT_FOUND);
        if (violation.status === ViolationStatus.CANCELLED) {
            throw new ConflictException(VIOLATION_CANCELLED);
        }

        await this.citizensService.findById(dto.applicant_id);

        const pending = await this.objectionModel.exists({
            violation_id: dto.violation_id,
            status: ObjectionStatus.PENDING,
            deleted_at: null,
        });

        if (pending) throw new ConflictException(PENDING_EXISTS);

        return this.objectionModel.create({
            violation_id: dto.violation_id,
            applicant_id: dto.applicant_id,
            reason: dto.reason,
            description: dto.description,
        });
    }

    async findAll(query: ObjectionsQueryDto): Promise<Paginated<Objection>> {
        const filter: Record<string, unknown> = { deleted_at: null };

        if (query.violation_id) filter.violation_id = query.violation_id;
        if (query.applicant_id) filter.applicant_id = query.applicant_id;
        if (query.reviewer_id) filter.reviewer_id = query.reviewer_id;
        if (query.status) filter.status = query.status;

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.created_at = range;
        }

        if (query.search) {
            filter.reason = {
                $regex: this.escapeRegex(query.search),
                $options: 'i',
            };
        }

        return paginate(
            this.objectionModel,
            filter as QueryFilter<Objection>,
            query,
            { created_at: -1 },
        );
    }

    async findById(id: string): Promise<ObjectionDocument> {
        const objection = await this.findDocument(id);

        await objection.populate([
            {
                path: 'violation_id',
                select: 'violation_number status fine_amount violation_date',
            },
            {
                path: 'applicant_id',
                select: 'national_id first_name father_name last_name phone',
            },
            {
                path: 'reviewer_id',
                select: 'username first_name last_name',
            },
        ]);

        return objection;
    }

    async update(
        id: string,
        dto: UpdateObjectionDto,
    ): Promise<ObjectionDocument> {
        const objection = await this.findDocument(id);

        if (objection.status !== ObjectionStatus.PENDING) {
            throw new ConflictException(EDIT_REVIEWED);
        }

        const update: Record<string, unknown> = {};

        if (dto.reason !== undefined) update.reason = dto.reason;
        if (dto.description !== undefined) {
            update.description = dto.description;
        }

        const updated = await this.objectionModel.findOneAndUpdate(
            {
                _id: id,
                deleted_at: null,
                status: ObjectionStatus.PENDING,
            },
            update,
            { new: true, runValidators: true },
        );

        if (!updated) throw new ConflictException(EDIT_REVIEWED);

        return updated;
    }

    async review(
        id: string,
        dto: ReviewObjectionDto,
        reviewerId: string,
    ): Promise<ObjectionDocument> {
        const objection = await this.findDocument(id);

        if (objection.status !== ObjectionStatus.PENDING) {
            throw new ConflictException(NOT_PENDING);
        }

        const updated = await this.objectionModel.findOneAndUpdate(
            {
                _id: id,
                deleted_at: null,
                status: ObjectionStatus.PENDING,
            },
            {
                status: dto.status,
                reviewer_id: reviewerId,
                reviewed_at: new Date(),
                review_notes: dto.review_notes,
            },
            { new: true, runValidators: true },
        );

        if (!updated) throw new ConflictException(NOT_PENDING);

        return updated;
    }

    async remove(id: string): Promise<void> {
        const exists = await this.objectionModel.exists({
            _id: id,
            deleted_at: null,
        });

        if (!exists) throw new NotFoundException(NOT_FOUND);

        await this.objectionModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );
    }

    private async findDocument(id: string): Promise<ObjectionDocument> {
        const objection = await this.objectionModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!objection) throw new NotFoundException(NOT_FOUND);

        return objection;
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
