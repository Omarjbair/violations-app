import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Notification {
    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        required: [true, 'المستخدم مطلوب'],
        index: true,
    })
    user_id: Types.ObjectId;

    @Prop({
        required: [true, 'عنوان الإشعار مطلوب'],
        trim: true,
    })
    title: string;

    @Prop({
        required: [true, 'نص الإشعار مطلوب'],
        trim: true,
    })
    body: string;

    @Prop({
        required: [true, 'نوع الإشعار مطلوب'],
        trim: true,
        index: true,
    })
    type: string;

    @Prop({ type: Object, default: {} })
    data: Record<string, unknown>;

    @Prop({ type: Date, default: null })
    read_at: Date | null;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
