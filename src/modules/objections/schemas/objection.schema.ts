import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Citizen } from '../../citizens/schemas/citizen.schema.js';
import { User } from '../../users/schemas/user.schema.js';
import { Violation } from '../../violations/schemas/violation.schema.js';

export type ObjectionDocument = HydratedDocument<Objection>;

export enum ObjectionStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Objection {
    @Prop({
        type: Types.ObjectId,
        ref: Violation.name,
        required: [true, 'المخالفة مطلوبة'],
        index: true,
    })
    violation_id: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        ref: Citizen.name,
        required: [true, 'المتقدم مطلوب'],
        index: true,
    })
    applicant_id: Types.ObjectId;

    @Prop({
        required: [true, 'سبب الاعتراض مطلوب'],
        trim: true,
    })
    reason: string;

    @Prop({ trim: true })
    description: string;

    @Prop({
        type: String,
        enum: {
            values: Object.values(ObjectionStatus),
            message: 'حالة الاعتراض غير صالحة',
        },
        default: ObjectionStatus.PENDING,
        index: true,
    })
    status: ObjectionStatus;

    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        default: null,
        index: true,
    })
    reviewer_id: Types.ObjectId | null;

    @Prop({ type: Date, default: null })
    reviewed_at: Date | null;

    @Prop({ trim: true })
    review_notes: string;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const ObjectionSchema = SchemaFactory.createForClass(Objection);
