import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ViolationTypeDocument = HydratedDocument<ViolationType>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ViolationType {
    @Prop({
        required: [true, 'رمز نوع المخالفة مطلوب'],
        trim: true,
        uppercase: true,
    })
    code: string;

    @Prop({
        required: [true, 'اسم نوع المخالفة مطلوب'],
        trim: true,
    })
    name: string;

    @Prop({ trim: true })
    description: string;

    @Prop({
        type: Number,
        required: [true, 'الغرامة الافتراضية مطلوبة'],
        min: [0, 'الغرامة الافتراضية يجب ألا تكون سالبة'],
    })
    default_fine: number;

    @Prop({ default: true })
    is_active: boolean;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const ViolationTypeSchema = SchemaFactory.createForClass(ViolationType);

ViolationTypeSchema.index(
    { code: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);

ViolationTypeSchema.index(
    { name: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
