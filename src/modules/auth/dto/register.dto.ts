import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

const SYRIAN_PHONE_REGEX = /^(?:\+963|00963|0)9[0-9]{8}$/;

export class RegisterDto {
    @IsString({ message: 'اسم المستخدم يجب أن يكون نصاً' })
    @MinLength(3, { message: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' })
    username: string;

    @IsString({ message: 'رقم الهاتف يجب أن يكون نصاً' })
    @Matches(SYRIAN_PHONE_REGEX, { message: 'رقم الهاتف يجب أن يكون رقماً صالحاً' })
    phone: string;

    @IsString({ message: 'كلمة المرور يجب أن تكون نصاً' })
    @MinLength(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
    password: string;

    @IsOptional()
    @IsString({ message: 'الاسم الأول يجب أن يكون نصاً' })
    first_name?: string;

    @IsOptional()
    @IsString({ message: 'اسم العائلة يجب أن يكون نصاً' })
    last_name?: string;
}