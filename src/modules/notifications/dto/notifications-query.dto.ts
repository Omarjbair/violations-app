import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class NotificationsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المستخدم غير صالح' })
    user_id?: string;

    @IsOptional()
    @IsString({ message: 'نوع الإشعار يجب أن يكون نصاً' })
    type?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        return value;
    })
    @IsBoolean({ message: 'حالة القراءة غير صالحة' })
    is_read?: boolean;

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
