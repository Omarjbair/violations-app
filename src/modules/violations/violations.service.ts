import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
    Violation,
    ViolationDocument,
    ViolationStatus,
} from './schemas/violation.schema.js';
import { CreateViolationDto } from './dto/create-violation.dto.js';
import { UpdateViolationDto } from './dto/update-violation.dto.js';
import { ViolationsQueryDto } from './dto/violations-query.dto.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';
import { CitizensService } from '../citizens/citizens.service.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';
import { ViolationTypesService } from '../violation-types/violation-types.service.js';
import { BranchesService } from '../branches/branches.service.js';
import { AuditService } from '../audit/audit.service.js';
import { toAuditSnapshot } from '../../common/utils/audit-snapshot.js';

const NOT_FOUND = 'المخالفة غير موجودة';
const ALREADY_CANCELLED = 'المخالفة ملغاة مسبقاً';
const HAS_PAYMENTS = 'لا يمكن إلغاء مخالفة عليها دفعات';
const DELETE_HAS_PAYMENTS = 'لا يمكن حذف مخالفة عليها دفعات';
const TYPE_INACTIVE = 'نوع المخالفة غير فعّال';
const FINE_LOCKED = 'لا يمكن تعديل الغرامة بعد بدء الدفع';
const GENERATE_FAILED = 'تعذر توليد رقم المخالفة، حاول مرة أخرى';

@Injectable()
export class ViolationsService {
    constructor(
        @InjectModel(Violation.name)
        private violationModel: Model<Violation>,
        private readonly citizensService: CitizensService,
        private readonly vehiclesService: VehiclesService,
        private readonly violationTypesService: ViolationTypesService,
        private readonly branchesService: BranchesService,
        private readonly auditService: AuditService,
    ) {}

    async create(
        dto: CreateViolationDto,
        officerId: string,
    ): Promise<ViolationDocument> {
        const [, , violationType] = await Promise.all([
            this.citizensService.findById(dto.citizen_id),
            this.vehiclesService.findById(dto.vehicle_id),
            this.violationTypesService.findById(dto.violation_type_id),
            this.branchesService.findById(dto.branch_id),
        ]);

        if (!violationType.is_active) {
            throw new ConflictException(TYPE_INACTIVE);
        }

        const payload = {
            citizen_id: dto.citizen_id,
            vehicle_id: dto.vehicle_id,
            violation_type_id: dto.violation_type_id,
            branch_id: dto.branch_id,
            officer_id: officerId,
            fine_amount: dto.fine_amount ?? violationType.default_fine,
            violation_date: dto.violation_date
                ? new Date(dto.violation_date)
                : new Date(),
            location: dto.location,
        };

        let violation: ViolationDocument | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                violation = await this.violationModel.create({
                    ...payload,
                    violation_number: this.generateViolationNumber(),
                });
                break;
            } catch (error) {
                if (!isDuplicateKeyError(error) || attempt === 2) throw error;
            }
        }

        if (!violation) throw new ConflictException(GENERATE_FAILED);

        await this.auditService.record({
            action: 'create',
            entityType: 'violation',
            entityId: violation.id,
            after: toAuditSnapshot(violation),
        });

        return violation;
    }

    async findAll(query: ViolationsQueryDto): Promise<Paginated<Violation>> {
        const filter: Record<string, unknown> = { deleted_at: null };

        if (query.status) filter.status = query.status;
        if (query.citizen_id) filter.citizen_id = query.citizen_id;
        if (query.vehicle_id) filter.vehicle_id = query.vehicle_id;
        if (query.violation_type_id) {
            filter.violation_type_id = query.violation_type_id;
        }
        if (query.branch_id) filter.branch_id = query.branch_id;
        if (query.officer_id) filter.officer_id = query.officer_id;

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.violation_date = range;
        }

        if (query.search) {
            filter.violation_number = {
                $regex: this.escapeRegex(query.search),
                $options: 'i',
            };
        }

        return paginate(
            this.violationModel,
            filter as QueryFilter<Violation>,
            query,
            { violation_date: -1, created_at: -1 },
        );
    }

    async findById(id: string): Promise<ViolationDocument> {
        const violation = await this.findDocument(id);

        await violation.populate([
            {
                path: 'citizen_id',
                select: 'national_id first_name father_name mother_name last_name phone',
            },
            {
                path: 'vehicle_id',
                select: 'plate_number plate_code plate_category vehicle_type make model color manufacture_year',
            },
            {
                path: 'violation_type_id',
                select: 'code name default_fine is_active',
            },
            { path: 'branch_id', select: 'code name phone' },
            { path: 'officer_id', select: 'username first_name last_name' },
            { path: 'paid_currency_id', select: 'code name' },
        ]);

        return violation;
    }

    async update(
        id: string,
        dto: UpdateViolationDto,
    ): Promise<ViolationDocument> {
        const violation = await this.findDocument(id);
        const before = toAuditSnapshot(violation);

        if (violation.status === ViolationStatus.CANCELLED) {
            throw new ConflictException(ALREADY_CANCELLED);
        }

        if (dto.fine_amount !== undefined && violation.paid_amount > 0) {
            throw new ConflictException(FINE_LOCKED);
        }

        if (dto.citizen_id) {
            await this.citizensService.findById(dto.citizen_id);
        }
        if (dto.vehicle_id) {
            await this.vehiclesService.findById(dto.vehicle_id);
        }
        if (dto.violation_type_id) {
            const violationType = await this.violationTypesService.findById(
                dto.violation_type_id,
            );

            if (!violationType.is_active) {
                throw new ConflictException(TYPE_INACTIVE);
            }
        }
        if (dto.branch_id) {
            await this.branchesService.findById(dto.branch_id);
        }

        const update: Record<string, unknown> = {};

        if (dto.citizen_id !== undefined) update.citizen_id = dto.citizen_id;
        if (dto.vehicle_id !== undefined) update.vehicle_id = dto.vehicle_id;
        if (dto.violation_type_id !== undefined) {
            update.violation_type_id = dto.violation_type_id;
        }
        if (dto.branch_id !== undefined) update.branch_id = dto.branch_id;
        if (dto.fine_amount !== undefined) {
            update.fine_amount = dto.fine_amount;
        }
        if (dto.violation_date !== undefined) {
            update.violation_date = new Date(dto.violation_date);
        }
        if (dto.location !== undefined) update.location = dto.location;

        const updated = await this.violationModel.findOneAndUpdate(
            { _id: id, deleted_at: null },
            update,
            { new: true, runValidators: true },
        );

        if (!updated) throw new NotFoundException(NOT_FOUND);

        await this.auditService.record({
            action: 'update',
            entityType: 'violation',
            entityId: updated.id,
            before,
            after: toAuditSnapshot(updated),
        });

        return updated;
    }

    async cancel(id: string): Promise<ViolationDocument> {
        const violation = await this.findDocument(id);
        const before = toAuditSnapshot(violation);

        if (violation.status === ViolationStatus.CANCELLED) {
            throw new ConflictException(ALREADY_CANCELLED);
        }

        if (
            violation.status === ViolationStatus.PAID ||
            violation.status === ViolationStatus.PARTIALLY_PAID
        ) {
            throw new ConflictException(HAS_PAYMENTS);
        }

        const updated = await this.violationModel.findOneAndUpdate(
            {
                _id: id,
                deleted_at: null,
                status: ViolationStatus.UNPAID,
            },
            {
                status: ViolationStatus.CANCELLED,
                cancelled_at: new Date(),
            },
            { new: true, runValidators: true },
        );

        if (!updated) throw new ConflictException(HAS_PAYMENTS);

        await this.auditService.record({
            action: 'cancel',
            entityType: 'violation',
            entityId: updated.id,
            before,
            after: toAuditSnapshot(updated),
        });

        return updated;
    }

    async remove(id: string): Promise<void> {
        const violation = await this.findDocument(id);
        const before = toAuditSnapshot(violation);

        if (
            violation.status === ViolationStatus.PAID ||
            violation.status === ViolationStatus.PARTIALLY_PAID
        ) {
            throw new ConflictException(DELETE_HAS_PAYMENTS);
        }

        await this.violationModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        await this.auditService.record({
            action: 'delete',
            entityType: 'violation',
            entityId: violation.id,
            before,
        });
    }

    private async findDocument(id: string): Promise<ViolationDocument> {
        const violation = await this.violationModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!violation) throw new NotFoundException(NOT_FOUND);

        return violation;
    }

    private generateViolationNumber(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

        return `V-${date}-${random}`;
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
