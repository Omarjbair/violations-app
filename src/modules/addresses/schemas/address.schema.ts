import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { State } from '../../states/schemas/state.schema.js';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Address {
    @Prop({
        type: Types.ObjectId,
        ref: State.name,
        required: [true, 'المحافظة مطلوبة'],
        index: true,
    })
    state_id: Types.ObjectId;

    @Prop({ required: [true, 'المدينة مطلوبة'], trim: true })
    city: string;

    @Prop({ required: [true, 'الشارع مطلوب'], trim: true })
    street: string;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const AddressSchema = SchemaFactory.createForClass(Address);