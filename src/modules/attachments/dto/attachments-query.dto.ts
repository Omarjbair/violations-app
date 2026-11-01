import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class AttachmentsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الاعتراض غير صالح' })
    objection_id?: string;

    @IsOptional()
    @IsString({ message: 'نوع الملف يجب أن يكون نصاً' })
    mime_type?: string;

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
