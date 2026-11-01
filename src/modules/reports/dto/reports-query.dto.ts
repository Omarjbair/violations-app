import { Type } from 'class-transformer';
import {
    IsDateString,
    IsEnum,
    IsIn,
    IsInt,
    IsMongoId,
    IsOptional,
    Max,
    Min,
} from 'class-validator';

export enum ReportType {
    REVENUE = 'revenue',
    VIOLATIONS = 'violations',
    TOP_OFFENDERS = 'top-offenders',
}

export class ReportsQueryDto {
    @IsOptional()
    @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
    from_date?: string;

    @IsOptional()
    @IsDateString({}, { message: 'تاريخ النهاية غير صالح' })
    to_date?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف الفرع غير صالح' })
    branch_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف العملة غير صالح' })
    currency_id?: string;

    @IsOptional()
    @IsMongoId({ message: 'معرّف نوع المخالفة غير صالح' })
    violation_type_id?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'الحد يجب أن يكون عدداً صحيحاً' })
    @Min(1, { message: 'الحد يجب أن يكون 1 على الأقل' })
    @Max(100, { message: 'الحد الأقصى 100 عنصر' })
    limit: number = 10;
}

export class ExportReportQueryDto extends ReportsQueryDto {
    @IsEnum(ReportType, { message: 'نوع التقرير غير صالح' })
    report: ReportType;

    @IsOptional()
    @IsIn(['csv'], { message: 'صيغة التصدير المدعومة هي CSV فقط' })
    format = 'csv' as const;
}
