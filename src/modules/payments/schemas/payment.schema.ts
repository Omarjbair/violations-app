import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Branch } from '../../branches/schemas/branch.schema.js';
import { Currency } from '../../currencies/schemas/currency.schema.js';
import { User } from '../../users/schemas/user.schema.js';
import { Violation } from '../../violations/schemas/violation.schema.js';

export type PaymentDocument = HydratedDocument<Payment>;

export enum PaymentStatus {
    COMPLETED = 'completed',
    REFUNDED = 'refunded',
    CANCELLED = 'cancelled',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Payment {
    @Prop({
        required: [true, 'رقم الإيصال مطلوب'],
        trim: true,
        index: true,
    })
    receipt_number: string;

    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        required: [true, 'المحاسب مطلوب'],
        index: true,
    })
    accountant_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Branch.name,
        required: [true, 'الفرع مطلوب'],
        index: true,
    })
    branch_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Violation.name,
        required: [true, 'المخالفة مطلوبة'],
        index: true,
    })
    violation_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Currency.name,
        required: [true, 'العملة مطلوبة'],
        index: true,
    })
    currency_id: Types.ObjectId;

    @Prop({
        type: Number,
        required: [true, 'مبلغ الدفعة مطلوب'],
        min: [0.01, 'مبلغ الدفعة يجب أن يكون أكبر من صفر'],
    })
    amount: number;

    @Prop({
        type: String,
        enum: {
            values: Object.values(PaymentStatus),
            message: 'حالة الدفعة غير صالحة',
        },
        default: PaymentStatus.COMPLETED,
        index: true,
    })
    status: PaymentStatus;

    @Prop({
        type: Date,
        required: [true, 'تاريخ الدفع مطلوب'],
        default: Date.now,
        index: true,
    })
    paid_at: Date;

    @Prop({ trim: true })
    notes: string;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index(
    { receipt_number: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
