import { IsString, MinLength } from 'class-validator';

export class CreateStateDto {
    @IsString({ message: 'اسم المحافظة يجب أن يكون نصاً' })
    @MinLength(2, { message: 'اسم المحافظة يجب أن يكون حرفين على الأقل' })
    name: string;
}