import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '../schemas/payment.schema.js';

export class UpdatePaymentDto {
    @IsOptional()
    @IsEnum(PaymentStatus, { message: 'حالة الدفعة غير صالحة' })
    status?: PaymentStatus;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ الدفع غير صالح' })
    paid_at?: string;

    @IsOptional()
    @IsString({ message: 'الملاحظات يجب أن تكون نصاً' })
    notes?: string;
}
