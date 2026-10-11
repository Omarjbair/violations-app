import { IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsString({ message: 'اسم المستخدم أو رقم الهاتف مطلوب' })
    login: string;

    @IsString({ message: 'كلمة المرور مطلوبة' })
    @MinLength(6)
    password: string;
}