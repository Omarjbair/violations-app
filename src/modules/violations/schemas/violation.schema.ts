import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Branch } from '../../branches/schemas/branch.schema.js';
import { Citizen } from '../../citizens/schemas/citizen.schema.js';
import { Currency } from '../../currencies/schemas/currency.schema.js';
import { User } from '../../users/schemas/user.schema.js';
import { Vehicle } from '../../vehicles/schemas/vehicle.schema.js';
import { ViolationType } from '../../violation-types/schemas/violation-type.schema.js';

export type ViolationDocument = HydratedDocument<Violation>;

export enum ViolationStatus {
    UNPAID = 'unpaid',
    PARTIALLY_PAID = 'partially_paid',
    PAID = 'paid',
    CANCELLED = 'cancelled',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Violation {
    @Prop({
        required: [true, 'رقم المخالفة مطلوب'],
        trim: true,
        index: true,
    })
    violation_number: string;

    @Prop({
        type: Types.ObjectId,
        ref: Citizen.name,
        required: [true, 'المواطن مطلوب'],
        index: true,
    })
    citizen_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Vehicle.name,
        required: [true, 'المركبة مطلوبة'],
        index: true,
    })
    vehicle_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: ViolationType.name,
        required: [true, 'نوع المخالفة مطلوب'],
        index: true,
    })
    violation_type_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Branch.name,
        required: [true, 'الفرع مطلوب'],
        index: true,
    })
    branch_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        required: [true, 'الضابط مطلوب'],
        index: true,
    })
    officer_id: Types.ObjectId;

    @Prop({
        type: String,
        enum: {
            values: Object.values(ViolationStatus),
            message: 'حالة المخالفة غير صالحة',
        },
        default: ViolationStatus.UNPAID,
        index: true,
    })
    status: ViolationStatus;

    @Prop({
        type: Number,
        required: [true, 'قيمة الغرامة مطلوبة'],
        min: [0, 'قيمة الغرامة يجب ألا تكون سالبة'],
    })
    fine_amount: number;

    @Prop({ type: Types.ObjectId, ref: Currency.name, default: null })
    paid_currency_id: Types.ObjectId | null;

    @Prop({ type: Number, default: 0, min: 0 })
    paid_amount: number;

    @Prop({
        type: Date,
        required: [true, 'تاريخ المخالفة مطلوب'],
        index: true,
    })
    violation_date: Date;

    @Prop({ trim: true })
    location: string;

    @Prop({ type: Date, default: null })
    cancelled_at: Date | null;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const ViolationSchema = SchemaFactory.createForClass(Violation);

ViolationSchema.index(
    { violation_number: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
