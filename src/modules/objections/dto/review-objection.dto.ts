import { IsIn, IsOptional, IsString } from 'class-validator';
import { ObjectionStatus } from '../schemas/objection.schema.js';

export class ReviewObjectionDto {
    @IsIn([ObjectionStatus.APPROVED, ObjectionStatus.REJECTED], {
        message: 'قرار المراجعة يجب أن يكون approved أو rejected',
    })
    status: ObjectionStatus;

    @IsOptional()
    @IsString({ message: 'ملاحظات المراجعة يجب أن تكون نصاً' })
    review_notes?: string;
}
