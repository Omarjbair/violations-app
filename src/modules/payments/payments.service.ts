import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import {
    Payment,
    PaymentDocument,
    PaymentStatus,
} from './schemas/payment.schema.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdatePaymentDto } from './dto/update-payment.dto.js';
import { PaymentsQueryDto } from './dto/payments-query.dto.js';
import {
    Violation,
    ViolationDocument,
    ViolationStatus,
} from '../violations/schemas/violation.schema.js';
import { CurrenciesService } from '../currencies/currencies.service.js';
import { BranchesService } from '../branches/branches.service.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';
import { isDuplicateKeyError } from '../../common/utils/mongo-errors.js';
import { AuditService } from '../audit/audit.service.js';
import { toAuditSnapshot } from '../../common/utils/audit-snapshot.js';
import { ReceiptPayment, renderPaymentReceipt } from './receipt.template.js';

const NOT_FOUND = 'الدفعة غير موجودة';
const VIOLATION_NOT_FOUND = 'المخالفة غير موجودة';
const VIOLATION_CANCELLED = 'لا يمكن الدفع لمخالفة ملغاة';
const ALREADY_PAID = 'المخالفة مدفوعة بالكامل';
const CURRENCY_MISMATCH = 'عملة الدفع يجب أن تطابق عملة الدفعات السابقة';
const EXCEEDS_REMAINING = 'المبلغ يتجاوز المتبقي من الغرامة';
const REFUND_ONLY = 'لا يمكن تعديل حالة دفعة غير مكتملة';
const GENERATE_FAILED = 'تعذر توليد رقم الإيصال، حاول مرة أخرى';

interface PaymentSummary {
    total: number;
    currency_id: Types.ObjectId;
}

@Injectable()
export class PaymentsService {
    constructor(
        @InjectModel(Payment.name)
        private paymentModel: Model<Payment>,
        @InjectModel(Violation.name)
        private violationModel: Model<Violation>,
        private readonly currenciesService: CurrenciesService,
        private readonly branchesService: BranchesService,
        private readonly auditService: AuditService,
    ) {}

    async create(
        dto: CreatePaymentDto,
        accountantId: string,
    ): Promise<PaymentDocument> {
        const violation = await this.findViolation(dto.violation_id);

        if (violation.status === ViolationStatus.CANCELLED) {
            throw new ConflictException(VIOLATION_CANCELLED);
        }
        if (violation.status === ViolationStatus.PAID) {
            throw new ConflictException(ALREADY_PAID);
        }

        await this.currenciesService.findById(dto.currency_id);

        let branchId = violation.branch_id.toString();

        if (dto.branch_id) {
            await this.branchesService.findById(dto.branch_id);
            branchId = dto.branch_id;
        }

        if (
            violation.paid_currency_id &&
            violation.paid_currency_id.toString() !== dto.currency_id
        ) {
            throw new ConflictException(CURRENCY_MISMATCH);
        }

        const remaining = this.round(
            violation.fine_amount - violation.paid_amount,
        );

        if (dto.amount > remaining) {
            throw new ConflictException(EXCEEDS_REMAINING);
        }

        const payload = {
            accountant_id: accountantId,
            branch_id: branchId,
            violation_id: dto.violation_id,
            currency_id: dto.currency_id,
            amount: dto.amount,
            status: PaymentStatus.COMPLETED,
            paid_at: dto.paid_at ? new Date(dto.paid_at) : new Date(),
            notes: dto.notes,
        };

        let payment: PaymentDocument | null = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                payment = await this.paymentModel.create({
                    ...payload,
                    receipt_number: this.generateReceiptNumber(),
                });
                break;
            } catch (error) {
                if (!isDuplicateKeyError(error) || attempt === 2) throw error;
            }
        }

        if (!payment) throw new ConflictException(GENERATE_FAILED);

        await this.recalculateViolation(dto.violation_id);

        await this.auditService.record({
            action: 'create',
            entityType: 'payment',
            entityId: payment.id,
            after: toAuditSnapshot(payment),
        });

        return payment;
    }

    async findAll(query: PaymentsQueryDto): Promise<Paginated<Payment>> {
        const filter: Record<string, unknown> = { deleted_at: null };

        if (query.violation_id) filter.violation_id = query.violation_id;
        if (query.currency_id) filter.currency_id = query.currency_id;
        if (query.branch_id) filter.branch_id = query.branch_id;
        if (query.accountant_id) filter.accountant_id = query.accountant_id;
        if (query.status) filter.status = query.status;

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.paid_at = range;
        }

        if (query.search) {
            filter.receipt_number = {
                $regex: this.escapeRegex(query.search),
                $options: 'i',
            };
        }

        return paginate(
            this.paymentModel,
            filter as QueryFilter<Payment>,
            query,
            { paid_at: -1, created_at: -1 },
        );
    }

    async findById(id: string): Promise<PaymentDocument> {
        const payment = await this.findDocument(id);

        await payment.populate([
            {
                path: 'violation_id',
                select: 'violation_number status fine_amount paid_amount violation_date',
            },
            { path: 'currency_id', select: 'code name' },
            { path: 'branch_id', select: 'code name' },
            {
                path: 'accountant_id',
                select: 'username first_name last_name',
            },
        ]);

        return payment;
    }

    async getReceiptHtml(id: string): Promise<string> {
        const payment = await this.findDocument(id);

        await payment.populate([
            {
                path: 'violation_id',
                select: 'violation_number status fine_amount paid_amount violation_date location citizen_id vehicle_id violation_type_id',
                populate: [
                    {
                        path: 'citizen_id',
                        select: 'national_id first_name father_name last_name phone',
                    },
                    {
                        path: 'vehicle_id',
                        select: 'plate_number plate_code plate_category make model color',
                    },
                    {
                        path: 'violation_type_id',
                        select: 'code name',
                    },
                ],
            },
            { path: 'currency_id', select: 'code name' },
            { path: 'branch_id', select: 'code name phone' },
            {
                path: 'accountant_id',
                select: 'username first_name last_name',
            },
        ]);

        return renderPaymentReceipt(payment as unknown as ReceiptPayment);
    }

    async update(id: string, dto: UpdatePaymentDto): Promise<PaymentDocument> {
        const payment = await this.findDocument(id);
        const before = toAuditSnapshot(payment);
        const update: Record<string, unknown> = {};

        if (dto.status && dto.status !== payment.status) {
            if (payment.status !== PaymentStatus.COMPLETED) {
                throw new ConflictException(REFUND_ONLY);
            }

            update.status = dto.status;
        }

        if (dto.paid_at !== undefined) update.paid_at = new Date(dto.paid_at);
        if (dto.notes !== undefined) update.notes = dto.notes;

        const updated = await this.paymentModel.findOneAndUpdate(
            { _id: id, deleted_at: null },
            update,
            { new: true, runValidators: true },
        );

        if (!updated) throw new NotFoundException(NOT_FOUND);

        if (update.status) {
            await this.recalculateViolation(payment.violation_id.toString());
        }

        await this.auditService.record({
            action: 'update',
            entityType: 'payment',
            entityId: updated.id,
            before,
            after: toAuditSnapshot(updated),
        });

        return updated;
    }

    async remove(id: string): Promise<void> {
        const payment = await this.findDocument(id);
        const before = toAuditSnapshot(payment);

        await this.paymentModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        await this.recalculateViolation(payment.violation_id.toString());

        await this.auditService.record({
            action: 'delete',
            entityType: 'payment',
            entityId: payment.id,
            before,
        });
    }

    private async findDocument(id: string): Promise<PaymentDocument> {
        const payment = await this.paymentModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!payment) throw new NotFoundException(NOT_FOUND);

        return payment;
    }

    private async findViolation(id: string): Promise<ViolationDocument> {
        const violation = await this.violationModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!violation) throw new NotFoundException(VIOLATION_NOT_FOUND);

        return violation;
    }

    private async recalculateViolation(violationId: string): Promise<void> {
        const [summary] = await this.paymentModel.aggregate<PaymentSummary>([
            {
                $match: {
                    violation_id: new Types.ObjectId(violationId),
                    deleted_at: null,
                    status: PaymentStatus.COMPLETED,
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    currency_id: { $first: '$currency_id' },
                },
            },
        ]);

        const violation = await this.violationModel.findOne({
            _id: violationId,
            deleted_at: null,
        });

        if (!violation || violation.status === ViolationStatus.CANCELLED) {
            return;
        }

        const total = this.round(summary?.total ?? 0);
        let status = ViolationStatus.UNPAID;

        if (total > 0) {
            status =
                total >= violation.fine_amount
                    ? ViolationStatus.PAID
                    : ViolationStatus.PARTIALLY_PAID;
        }

        await this.violationModel.updateOne(
            { _id: violationId },
            {
                paid_amount: total,
                paid_currency_id:
                    total > 0 ? (summary?.currency_id ?? null) : null,
                status,
            },
        );
    }

    private generateReceiptNumber(): string {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

        return `R-${date}-${random}`;
    }

    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
