import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
    @Prop({
        required: [true, 'اسم المستخدم مطلوب'],
        unique: true,
        trim: true,
        minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'],
    })
    username: string;

    @Prop({
        required: [true, 'رقم الهاتف مطلوب'],
        unique: true,
        trim: true,
    })
    phone: string;

    @Prop({
        required: [true, 'كلمة المرور مطلوبة'],
        select: false,
        minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    })
    password: string;

    @Prop({ trim: true })
    first_name: string;

    @Prop({ trim: true })
    last_name: string;

    @Prop({ default: true })
    is_active: boolean;

    @Prop({ type: Types.ObjectId, ref: 'Branch' })
    branch_id: Types.ObjectId;

    @Prop({
        type: String,
        enum: {
            values: Object.values(UserRole),
            message: 'الدور يجب أن يكون admin أو user',
        },
        default: UserRole.USER,
    })
    role: UserRole;

    @Prop({ type: Date, default: null })
    deleted_at: Date;

    @Prop({ type: String, default: null, select: false })
    refresh_token_hash: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);