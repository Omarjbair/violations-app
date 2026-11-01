import { IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class AuditLogsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المستخدم غير صالح' })
    actor_id?: string;

    @IsOptional()
    @IsString({ message: 'الإجراء يجب أن يكون نصاً' })
    action?: string;

    @IsOptional()
    @IsString({ message: 'نوع الكيان يجب أن يكون نصاً' })
    entity_type?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الكيان غير صالح' })
    entity_id?: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
    from_date?: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
    to_date?: string;
}
