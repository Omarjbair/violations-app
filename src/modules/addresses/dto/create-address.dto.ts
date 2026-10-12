import { IsMongoId, IsString, MinLength } from 'class-validator';

export class CreateAddressDto {
    @IsMongoId({ message: 'معرّف المحافظة غير صالح' })
    state_id: string;

    @IsString({ message: 'المدينة يجب أن تكون نصاً' })
    @MinLength(2, { message: 'المدينة يجب أن تكون حرفين على الأقل' })
    city: string;

    @IsString({ message: 'الشارع يجب أن يكون نصاً' })
    @MinLength(2, { message: 'الشارع يجب أن يكون حرفين على الأقل' })
    street: string;
}