import {
    IsDateString,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ObjectionStatus } from '../schemas/objection.schema.js';

export class ObjectionsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف المتقدم غير صالح' })
    applicant_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف المراجع غير صالح' })
    reviewer_id?: string;

    @IsOptional()
    @IsEnum(ObjectionStatus, { message: 'حالة الاعتراض غير صالحة' })
    status?: ObjectionStatus;

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
