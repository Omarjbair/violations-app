import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema.js';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class AuditLog {
    @Prop({
        type: Types.ObjectId,
        ref: User.name,
        default: null,
        index: true,
    })
    actor_id: Types.ObjectId | null;

    @Prop({
        required: [true, 'الإجراء مطلوب'],
        trim: true,
        index: true,
    })
    action: string;

    @Prop({
        required: [true, 'نوع الكيان مطلوب'],
        trim: true,
        index: true,
    })
    entity_type: string;

    @Prop({
        type: Types.ObjectId,
        required: [true, 'معرّف الكيان مطلوب'],
        index: true,
    })
    entity_id: Types.ObjectId;

    @Prop({ type: Object, default: null })
    before: Record<string, unknown> | null;

    @Prop({ type: Object, default: null })
    after: Record<string, unknown> | null;

    @Prop({ type: String, default: null })
    ip: string | null;

    @Prop({ type: String, default: null })
    user_agent: string | null;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ entity_type: 1, entity_id: 1 });
AuditLogSchema.index({ created_at: -1 });
