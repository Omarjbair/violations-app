import {
    IsBoolean,
    IsDateString,
    IsMongoId,
    IsOptional,
} from 'class-validator';

export class CreateVehicleOwnerDto {
    @IsMongoId({ message: 'معرّف المواطن غير صالح' })
    citizen_id: string;

    @IsOptional()
    @IsBoolean({ message: 'قيمة المالك الأساسي غير صالحة' })
    is_primary?: boolean;

    @IsDateString({}, { message: 'تاريخ بداية الملكية غير صالح' })
    started_at: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ نهاية الملكية غير صالح' })
    ended_at?: string | null;
}
