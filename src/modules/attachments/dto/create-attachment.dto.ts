import { IsMongoId, IsOptional } from 'class-validator';

export class CreateAttachmentDto {
    @IsOptional()
    @IsMongoId({ message: 'معرّف المخالفة غير صالح' })
    violation_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الاعتراض غير صالح' })
    objection_id?: string;
}
