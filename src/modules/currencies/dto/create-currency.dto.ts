import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCurrencyDto {
    @Matches(/^[A-Za-z]{3}$/, {
        message: 'رمز العملة يجب أن يتكون من 3 أحرف',
    })
    code: string;

    @IsString({ message: 'اسم العملة يجب أن يكون نصاً' })
    @MinLength(2, { message: 'اسم العملة يجب أن يكون حرفين على الأقل' })
    @MaxLength(50, { message: 'اسم العملة يجب ألا يتجاوز 50 حرفاً' })
    name: string;
}
