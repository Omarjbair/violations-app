import { Type } from 'class-transformer';
import {
    IsDateString,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateViolationDto {
    @IsMongoId({ message: 'معرّف المواطن غير صالح' })
    citizen_id: string;

    @IsMongoId({ message: 'معرّف المركبة غير صالح' })
    vehicle_id: string;

    @IsMongoId({ message: 'معرّف نوع المخالفة غير صالح' })
    violation_type_id: string;

    @IsMongoId({ message: 'معرّف الفرع غير صالح' })
    branch_id: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber(
        { maxDecimalPlaces: 2 },
        { message: 'قيمة الغرامة يجب أن تكون رقماً' },
    )
    @Min(0, { message: 'قيمة الغرامة يجب ألا تكون سالبة' })
    fine_amount?: number;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ المخالفة غير صالح' })
    violation_date?: string;

    @IsOptional()
    @IsString({ message: 'الموقع يجب أن يكون نصاً' })
    location?: string;
}
