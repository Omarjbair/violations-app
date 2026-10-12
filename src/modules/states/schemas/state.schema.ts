import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type StateDocument = HydratedDocument<State>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class State {
    @Prop({
        required: [true, 'اسم المحافظة مطلوب'],
        unique: true,
        trim: true,
    })
    name: string;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const StateSchema = SchemaFactory.createForClass(State);