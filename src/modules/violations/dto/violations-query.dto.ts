import {
    IsDateString,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ViolationStatus } from '../schemas/violation.schema.js';

export class ViolationsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(ViolationStatus, { message: 'حالة المخالفة غير صالحة' })
    status?: ViolationStatus;

    @IsOptional()
    @IsMongoId({ message: 'معرّف المواطن غير صالح' })
    citizen_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف المركبة غير صالح' })
    vehicle_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف نوع المخالفة غير صالح' })
    violation_type_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الفرع غير صالح' })
    branch_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الضابط غير صالح' })
    officer_id?: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
    from_date?: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
    to_date?: string;

    @IsOptional()
    @IsString({ message: 'البحث يجب أن يكون نصاً' })
    search?: string;
}
