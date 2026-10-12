import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'رقم الصفحة يجب أن يكون عدداً صحيحاً' })
    @Min(1, { message: 'رقم الصفحة يجب أن يكون 1 على الأقل' })
    page: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'عدد العناصر يجب أن يكون عدداً صحيحاً' })
    @Min(1, { message: 'عدد العناصر يجب أن يكون 1 على الأقل' })
    @Max(100, { message: 'الحد الأقصى 100 عنصر بالصفحة' })
    limit: number = 20;
}