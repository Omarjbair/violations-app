import {
    IsMongoId,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateNotificationDto {
    @IsMongoId({ message: 'معرّف المستخدم غير صالح' })
    user_id: string;

    @IsString({ message: 'عنوان الإشعار يجب أن يكون نصاً' })
    @MinLength(3, { message: 'عنوان الإشعار يجب أن يكون 3 أحرف على الأقل' })
    @MaxLength(200, { message: 'عنوان الإشعار يجب ألا يتجاوز 200 حرف' })
    title: string;

    @IsString({ message: 'نص الإشعار يجب أن يكون نصاً' })
    @MinLength(3, { message: 'نص الإشعار يجب أن يكون 3 أحرف على الأقل' })
    @MaxLength(2000, { message: 'نص الإشعار يجب ألا يتجاوز 2000 حرف' })
    body: string;

    @IsString({ message: 'نوع الإشعار يجب أن يكون نصاً' })
    @MinLength(2, { message: 'نوع الإشعار يجب أن يكون حرفين على الأقل' })
    @MaxLength(50, { message: 'نوع الإشعار يجب ألا يتجاوز 50 حرفاً' })
    type: string;

    @IsOptional()
    @IsObject({ message: 'بيانات الإشعار يجب أن تكون كائناً' })
    data?: Record<string, unknown>;
}
