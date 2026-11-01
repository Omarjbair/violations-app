import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Address } from '../../addresses/schemas/address.schema.js';

export type BranchDocument = HydratedDocument<Branch>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Branch {
    @Prop({
        required: [true, 'رمز الفرع مطلوب'],
        trim: true,
        uppercase: true,
    })
    code: string;

    @Prop({
        required: [true, 'اسم الفرع مطلوب'],
        trim: true,
    })
    name: string;

    @Prop({
        required: [true, 'رقم الهاتف مطلوب'],
        trim: true,
    })
    phone: string;

    @Prop({
        type: Types.ObjectId,
        ref: Address.name,
        required: [true, 'العنوان مطلوب'],
        index: true,
    })
    address_id: Types.ObjectId;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

BranchSchema.index(
    { code: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);

BranchSchema.index(
    { name: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
