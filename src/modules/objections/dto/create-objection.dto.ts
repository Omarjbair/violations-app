import {
    IsMongoId,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateObjectionDto {
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id: string;

    @IsMongoId({ message: 'معرّف المتقدم غير صالح' })
    applicant_id: string;

    @IsString({ message: 'سبب الاعتراض يجب أن يكون نصاً' })
    @MinLength(3, { message: 'سبب الاعتراض يجب أن يكون 3 أحرف على الأقل' })
    @MaxLength(500, { message: 'سبب الاعتراض يجب ألا يتجاوز 500 حرف' })
    reason: string;

    @IsOptional()
    @IsString({ message: 'وصف الاعتراض يجب أن يكون نصاً' })
    @MaxLength(2000, { message: 'وصف الاعتراض يجب ألا يتجاوز 2000 حرف' })
    description?: string;
}
