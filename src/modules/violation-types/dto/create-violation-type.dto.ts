import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
    MinLength,
} from 'class-validator';

export class CreateViolationTypeDto {
    @IsString({ message: 'رمز نوع المخالفة يجب أن يكون نصاً' })
    @Matches(/^[A-Za-z0-9_-]{2,30}$/, {
        message: 'رمز نوع المخالفة يجب أن يتكون من 2-30 حرفاً أو رقماً',
    })
    code: string;

    @IsString({ message: 'اسم نوع المخالفة يجب أن يكون نصاً' })
    @MinLength(2, { message: 'اسم نوع المخالفة يجب أن يكون حرفين على الأقل' })
    name: string;

    @IsOptional()
    @IsString({ message: 'الوصف يجب أن يكون نصاً' })
    description?: string;

    @Type(() => Number)
    @IsNumber(
        { maxDecimalPlaces: 2 },
        { message: 'الغرامة الافتراضية يجب أن تكون رقماً' },
    )
    @Min(0, { message: 'الغرامة الافتراضية يجب ألا تكون سالبة' })
    default_fine: number;

    @IsOptional()
    @IsBoolean({ message: 'حالة نوع المخالفة غير صالحة' })
    is_active?: boolean;
}
