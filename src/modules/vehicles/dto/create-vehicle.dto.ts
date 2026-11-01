import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from 'class-validator';
import { VehicleType } from '../schemas/vehicle.schema.js';

const MAX_MANUFACTURE_YEAR = new Date().getFullYear() + 1;

export class CreateVehicleDto {
    @IsString({ message: 'رقم اللوحة يجب أن يكون نصاً' })
    @Matches(/^[A-Za-z0-9-]{1,20}$/, { message: 'رقم اللوحة غير صالح' })
    plate_number: string;

    @IsString({ message: 'رمز اللوحة يجب أن يكون نصاً' })
    @Matches(/^[A-Za-z0-9-]{1,10}$/, { message: 'رمز اللوحة غير صالح' })
    plate_code: string;

    @IsOptional()
    @IsString({ message: 'فئة اللوحة يجب أن تكون نصاً' })
    @Matches(/\S/, { message: 'فئة اللوحة غير صالحة' })
    plate_category?: string;

    @IsEnum(VehicleType, { message: 'نوع المركبة غير صالح' })
    vehicle_type: VehicleType;

    @IsString({ message: 'الشركة المصنعة يجب أن تكون نصاً' })
    @Matches(/\S/, { message: 'الشركة المصنعة مطلوبة' })
    make: string;

    @IsString({ message: 'الطراز يجب أن يكون نصاً' })
    @Matches(/\S/, { message: 'الطراز مطلوب' })
    model: string;

    @IsOptional()
    @IsString({ message: 'اللون يجب أن يكون نصاً' })
    color?: string;

    @Type(() => Number)
    @IsInt({ message: 'سنة الصنع يجب أن تكون عدداً صحيحاً' })
    @Min(1900, { message: 'سنة الصنع غير صالحة' })
    @Max(MAX_MANUFACTURE_YEAR, { message: 'سنة الصنع غير صالحة' })
    manufacture_year: number;
}
