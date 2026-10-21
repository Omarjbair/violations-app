import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Address } from '../../addresses/schemas/address.schema.js';

export type CitizenDocument = HydratedDocument<Citizen>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Citizen {
    @Prop({ required: [true, 'الرقم الوطني مطلوب'], trim: true })
    national_id: string;

    @Prop({ required: [true, 'الاسم الأول مطلوب'], trim: true })
    first_name: string;

    @Prop({ required: [true, 'اسم الأب مطلوب'], trim: true })
    father_name: string;

    @Prop({ required: [true, 'اسم الأم مطلوب'], trim: true })
    mother_name: string;

    @Prop({ required: [true, 'الكنية مطلوبة'], trim: true })
    last_name: string;

    @Prop({ type: Date, required: [true, 'تاريخ الميلاد مطلوب'] })
    date_of_birth: Date;

    @Prop({ required: [true, 'رقم الهاتف مطلوب'], trim: true })
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

export const CitizenSchema = SchemaFactory.createForClass(Citizen);

CitizenSchema.index(
    { national_id: 1 },
    {
        unique: true,
        partialFilterExpression: { deleted_at: { $type: 'null' } },
    },
);

CitizenSchema.index(
    { address_id: 1 },
    { unique: true, partialFilterExpression: { deleted_at: { $type: 'null' } } },
);