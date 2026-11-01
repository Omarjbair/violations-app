import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Objection } from '../../objections/schemas/objection.schema.js';
import { Violation } from '../../violations/schemas/violation.schema.js';

export type AttachmentDocument = HydratedDocument<Attachment>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Attachment {
    @Prop({
        required: [true, 'اسم الملف المخزن مطلوب'],
        trim: true,
    })
    file_name: string;

    @Prop({
        required: [true, 'اسم الملف الأصلي مطلوب'],
        trim: true,
    })
    original_name: string;

    @Prop({
        required: [true, 'نوع الملف مطلوب'],
        trim: true,
    })
    mime_type: string;

    @Prop({
        type: Number,
        required: [true, 'حجم الملف مطلوب'],
        min: [0, 'حجم الملف غير صالح'],
    })
    size: number;

    @Prop({
        required: [true, 'مسار الملف مطلوب'],
        trim: true,
    })
    path: string;

    @Prop({
        type: Types.ObjectId,
        ref: Violation.name,
        default: null,
        index: true,
    })
    violation_id: Types.ObjectId | null;

    @Prop({
        type: Types.ObjectId,
        ref: Objection.name,
        default: null,
        index: true,
    })
    objection_id: Types.ObjectId | null;

    @Prop({ type: Date, default: null })
    deleted_at: Date | null;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
