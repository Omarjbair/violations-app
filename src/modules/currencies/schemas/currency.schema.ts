import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CurrencyDocument = HydratedDocument<Currency>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Currency {
    @Prop({
        required: [true, 'رمز العملة مطلوب'],
        trim: true,
        uppercase: true,
    })
    code: string;

    @Prop({
        required: [true, 'اسم العملة مطلوب'],
        trim: true,
    })
    name: string;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const CurrencySchema = SchemaFactory.createForClass(Currency);

CurrencySchema.index(
    { code: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);

CurrencySchema.index(
    { name: 1 },
    { unique: true, partialFilterExpression: { deleted_at: null } },
);
