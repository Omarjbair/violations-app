import {
    IsDateString,
    IsMongoId,
    IsNotEmpty,
    IsString,
    Matches,
} from 'class-validator';

export class CreateCitizenDto {
    @Matches(/^\d{11}$/, { message: 'الرقم الوطني يجب أن يتكون من 11 رقماً' })
    national_id: string;

    @IsString()
    @IsNotEmpty({ message: 'الاسم الأول مطلوب' })
    first_name: string;

    @IsString()
    @IsNotEmpty({ message: 'اسم الأب مطلوب' })
    father_name: string;

    @IsString()
    @IsNotEmpty({ message: 'اسم الأم مطلوب' })
    mother_name: string;

    @IsString()
    @IsNotEmpty({ message: 'الكنية مطلوبة' })
    last_name: string;

    @IsDateString({}, { message: 'تاريخ الميلاد غير صالح' })
    date_of_birth: string;

    @Matches(/^\+?\d{7,15}$/, { message: 'رقم الهاتف غير صالح' })
    phone: string;

    @IsMongoId({ message: 'معرّف العنوان غير صالح' })
    address_id: string;
}