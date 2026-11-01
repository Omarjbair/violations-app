import {
    IsDateString,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { PaymentStatus } from '../schemas/payment.schema.js';

export class PaymentsQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف العملة غير صالح' })
    currency_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الفرع غير صالح' })
    branch_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف المحاسب غير صالح' })
    accountant_id?: string;

    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'حالة الدفعة غير صالحة' })
    status?: PaymentStatus;

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
