import { IsMongoId, IsString, Matches, MinLength } from 'class-validator';
import {
    BRANCH_CODE_REGEX,
    SYRIAN_PHONE_REGEX,
} from '../../../common/constants/patterns.js';

export class CreateBranchDto {
    @Matches(BRANCH_CODE_REGEX, {
        message: 'رمز الفرع يجب أن يتكون من 2-20 حرفاً أو رقماً أو شرطة',
    })
    code: string;

    @IsString({ message: 'اسم الفرع يجب أن يكون نصاً' })
    @MinLength(2, { message: 'اسم الفرع يجب أن يكون حرفين على الأقل' })
    name: string;

    @Matches(SYRIAN_PHONE_REGEX, { message: 'رقم الهاتف غير صالح' })
    phone: string;

    @IsMongoId({ message: 'معرّف العنوان غير صالح' })
    address_id: string;
}
