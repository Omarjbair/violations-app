import { Type } from 'class-transformer';
import {
    IsDateString,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreatePaymentDto {
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id: string;

    @IsMongoId({ message: 'معرّف العملة غير صالح' })
    currency_id: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الفرع غير صالح' })
    branch_id?: string;

    @Type(() => Number)
    @IsNumber(
        { maxDecimalPlaces: 2 },
        { message: 'مبلغ الدفعة يجب أن يكون رقماً' },
    )
    @Min(0.01, { message: 'مبلغ الدفعة يجب أن يكون أكبر من صفر' })
    amount: number;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ الدفع غير صالح' })
    paid_at?: string;

    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
    notes?: string;
}
