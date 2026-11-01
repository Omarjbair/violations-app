import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, PipelineStage } from 'mongoose';
import { Types } from 'mongoose';
import { Payment, PaymentStatus } from '../payments/schemas/payment.schema.js';
import { Violation } from '../violations/schemas/violation.schema.js';
import { Branch } from '../branches/schemas/branch.schema.js';
import { Currency } from '../currencies/schemas/currency.schema.js';
import { ViolationType } from '../violation-types/schemas/violation-type.schema.js';
import { Citizen } from '../citizens/schemas/citizen.schema.js';
import { RedisService } from '../../redis/redis.service.js';
import { ReportType, ReportsQueryDto } from './dto/reports-query.dto.js';

const REPORT_CACHE_TTL = 60;

export interface RevenueReportRow {
    date: string;
    currency_id: string;
    currency_code: string;
    currency_name: string;
    branch_id: string | null;
    branch_code: string | null;
    branch_name: string | null;
    total: number;
    count: number;
}

export interface RevenueReportTotals {
    currency_id: string;
    currency_code: string;
    currency_name: string;
    total: number;
}

export interface RevenueReport {
    rows: RevenueReportRow[];
    totals: RevenueReportTotals[];
}

export interface ViolationsByStatusRow {
    status: string;
    count: number;
    total_fines: number;
}

export interface ViolationsByTypeRow {
    violation_type_id: string;
    code: string | null;
    name: string | null;
    count: number;
    total_fines: number;
}

export interface ViolationsReport {
    summary: { total: number; total_fines: number };
    by_status: ViolationsByStatusRow[];
    by_type: ViolationsByTypeRow[];
}

export interface TopOffenderRow {
    rank: number;
    citizen_id: string;
    national_id: string | null;
    full_name: string;
    phone: string | null;
    violations_count: number;
    total_fines: number;
}

export interface CsvExport {
    filename: string;
    csv: string;
}

interface RevenueAggRow {
    _id: {
        date: string;
        currency_id: Types.ObjectId;
        branch_id: Types.ObjectId;
    };
    total: number;
    count: number;
    currency?: { code?: string; name?: string };
    branch?: { code?: string; name?: string };
}

interface ViolationsAggRow {
    summary: { total: number; total_fines: number }[];
    by_status: { _id: string; count: number; total_fines: number }[];
    by_type: {
        violation_type_id: Types.ObjectId;
        code?: string;
        name?: string;
        count: number;
        total_fines: number;
    }[];
}

interface TopOffenderAggRow {
    _id: Types.ObjectId;
    violations_count: number;
    total_fines: number;
    citizen?: {
        national_id?: string;
        first_name?: string;
        father_name?: string;
        last_name?: string;
        phone?: string;
    };
}

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Payment.name)
        private paymentModel: Model<Payment>,
        @InjectModel(Violation.name)
        private violationModel: Model<Violation>,
        @InjectModel(Branch.name)
        private branchModel: Model<Branch>,
        @InjectModel(Currency.name)
        private currencyModel: Model<Currency>,
        @InjectModel(ViolationType.name)
        private violationTypeModel: Model<ViolationType>,
        @InjectModel(Citizen.name)
        private citizenModel: Model<Citizen>,
        private readonly redisService: RedisService,
    ) {}

    async revenue(query: ReportsQueryDto): Promise<RevenueReport> {
        return this.redisService.getOrSet(
            this.cacheKey('revenue', query),
            REPORT_CACHE_TTL,
            () => this.buildRevenue(query),
        );
    }

    async violations(query: ReportsQueryDto): Promise<ViolationsReport> {
        return this.redisService.getOrSet(
            this.cacheKey('violations', query),
            REPORT_CACHE_TTL,
            () => this.buildViolations(query),
        );
    }

    async topOffenders(query: ReportsQueryDto): Promise<TopOffenderRow[]> {
        return this.redisService.getOrSet(
            this.cacheKey('top-offenders', query),
            REPORT_CACHE_TTL,
            () => this.buildTopOffenders(query),
        );
    }

    async exportCsv(
        report: ReportType,
        query: ReportsQueryDto,
    ): Promise<CsvExport> {
        const filename = `report-${report}-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        if (report === ReportType.REVENUE) {
            const data = await this.revenue(query);
            const rows = data.rows.map((row) => [
                row.date,
                row.currency_code,
                row.currency_name,
                row.branch_code ?? '',
                row.branch_name ?? '',
                row.total.toFixed(2),
                row.count,
            ]);

            return {
                filename,
                csv: this.toCsv(
                    [
                        'التاريخ',
                        'رمز العملة',
                        'العملة',
                        'رمز الفرع',
                        'الفرع',
                        'الإجمالي',
                        'عدد الدفعات',
                    ],
                    rows,
                ),
            };
        }

        if (report === ReportType.TOP_OFFENDERS) {
            const data = await this.topOffenders(query);
            const rows = data.map((row) => [
                row.rank,
                row.national_id ?? '',
                row.full_name,
                row.phone ?? '',
                row.violations_count,
                row.total_fines.toFixed(2),
            ]);

            return {
                filename,
                csv: this.toCsv(
                    [
                        'الترتيب',
                        'الرقم الوطني',
                        'الاسم',
                        'الهاتف',
                        'عدد المخالفات',
                        'إجمالي الغرامات',
                    ],
                    rows,
                ),
            };
        }

        const data = await this.violations(query);
        const rows = [
            ...data.by_status.map((row) => [
                'status',
                row.status,
                '',
                '',
                row.count,
                row.total_fines.toFixed(2),
            ]),
            ...data.by_type.map((row) => [
                'type',
                row.violation_type_id,
                row.code ?? '',
                row.name ?? '',
                row.count,
                row.total_fines.toFixed(2),
            ]),
        ];

        return {
            filename,
            csv: this.toCsv(
                [
                    'التصنيف',
                    'المفتاح',
                    'الرمز',
                    'الاسم',
                    'العدد',
                    'إجمالي الغرامات',
                ],
                rows,
            ),
        };
    }

    private async buildRevenue(query: ReportsQueryDto): Promise<RevenueReport> {
        const pipeline: PipelineStage[] = [
            { $match: this.paymentMatch(query) },
            {
                $group: {
                    _id: {
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$paid_at',
                            },
                        },
                        currency_id: '$currency_id',
                        branch_id: '$branch_id',
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.date': 1 } },
            {
                $lookup: {
                    from: this.currencyModel.collection.name,
                    localField: '_id.currency_id',
                    foreignField: '_id',
                    as: 'currency',
                },
            },
            {
                $lookup: {
                    from: this.branchModel.collection.name,
                    localField: '_id.branch_id',
                    foreignField: '_id',
                    as: 'branch',
                },
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    currency_id: '$_id.currency_id',
                    branch_id: '$_id.branch_id',
                    total: 1,
                    count: 1,
                    currency: { $arrayElemAt: ['$currency', 0] },
                    branch: { $arrayElemAt: ['$branch', 0] },
                },
            },
        ];

        const result =
            await this.paymentModel.aggregate<RevenueAggRow>(pipeline);
        const totals = new Map<string, RevenueReportTotals>();

        const rows = result.map((row) => {
            const currencyCode = row.currency?.code ?? 'UNKNOWN';
            const currencyName = row.currency?.name ?? 'غير معروفة';
            const currencyId = row._id.currency_id.toString();
            const totalRow = totals.get(currencyId) ?? {
                currency_id: currencyId,
                currency_code: currencyCode,
                currency_name: currencyName,
                total: 0,
            };

            totalRow.total += row.total;
            totals.set(currencyId, totalRow);

            return {
                date: row._id.date,
                currency_id: currencyId,
                currency_code: currencyCode,
                currency_name: currencyName,
                branch_id: row._id.branch_id?.toString() ?? null,
                branch_code: row.branch?.code ?? null,
                branch_name: row.branch?.name ?? null,
                total: row.total,
                count: row.count,
            };
        });

        return {
            rows,
            totals: [...totals.values()].sort((a, b) =>
                a.currency_code.localeCompare(b.currency_code),
            ),
        };
    }

    private async buildViolations(
        query: ReportsQueryDto,
    ): Promise<ViolationsReport> {
        const pipeline: PipelineStage[] = [
            { $match: this.violationMatch(query) },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                total_fines: { $sum: '$fine_amount' },
                            },
                        },
                    ],
                    by_status: [
                        {
                            $group: {
                                _id: '$status',
                                count: { $sum: 1 },
                                total_fines: { $sum: '$fine_amount' },
                            },
                        },
                        { $sort: { _id: 1 } },
                    ],
                    by_type: [
                        {
                            $group: {
                                _id: '$violation_type_id',
                                count: { $sum: 1 },
                                total_fines: { $sum: '$fine_amount' },
                            },
                        },
                        { $sort: { count: -1, total_fines: -1 } },
                        {
                            $lookup: {
                                from: this.violationTypeModel.collection.name,
                                localField: '_id',
                                foreignField: '_id',
                                as: 'type',
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                violation_type_id: '$_id',
                                code: { $arrayElemAt: ['$type.code', 0] },
                                name: { $arrayElemAt: ['$type.name', 0] },
                                count: 1,
                                total_fines: 1,
                            },
                        },
                    ],
                },
            },
        ];

        const [result] =
            await this.violationModel.aggregate<ViolationsAggRow>(pipeline);
        const summary = result?.summary[0] ?? { total: 0, total_fines: 0 };

        return {
            summary: {
                total: summary.total,
                total_fines: summary.total_fines,
            },
            by_status: (result?.by_status ?? []).map((row) => ({
                status: row._id,
                count: row.count,
                total_fines: row.total_fines,
            })),
            by_type: (result?.by_type ?? []).map((row) => ({
                violation_type_id: row.violation_type_id.toString(),
                code: row.code ?? null,
                name: row.name ?? null,
                count: row.count,
                total_fines: row.total_fines,
            })),
        };
    }

    private async buildTopOffenders(
        query: ReportsQueryDto,
    ): Promise<TopOffenderRow[]> {
        const pipeline: PipelineStage[] = [
            { $match: this.violationMatch(query) },
            {
                $group: {
                    _id: '$citizen_id',
                    violations_count: { $sum: 1 },
                    total_fines: { $sum: '$fine_amount' },
                },
            },
            {
                $sort: {
                    violations_count: -1,
                    total_fines: -1,
                },
            },
            { $limit: query.limit },
            {
                $lookup: {
                    from: this.citizenModel.collection.name,
                    localField: '_id',
                    foreignField: '_id',
                    as: 'citizen',
                },
            },
            {
                $project: {
                    _id: 1,
                    violations_count: 1,
                    total_fines: 1,
                    citizen: { $arrayElemAt: ['$citizen', 0] },
                },
            },
        ];

        const result =
            await this.violationModel.aggregate<TopOffenderAggRow>(pipeline);

        return result.map((row, index) => {
            const citizen = row.citizen;
            const fullName = [
                citizen?.first_name,
                citizen?.father_name,
                citizen?.last_name,
            ]
                .filter(Boolean)
                .join(' ');

            return {
                rank: index + 1,
                citizen_id: row._id.toString(),
                national_id: citizen?.national_id ?? null,
                full_name: fullName || 'غير معروف',
                phone: citizen?.phone ?? null,
                violations_count: row.violations_count,
                total_fines: row.total_fines,
            };
        });
    }

    private paymentMatch(query: ReportsQueryDto): Record<string, unknown> {
        const match: Record<string, unknown> = {
            deleted_at: null,
            status: PaymentStatus.COMPLETED,
        };

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            match.paid_at = range;
        }
        if (query.branch_id) match.branch_id = query.branch_id;
        if (query.currency_id) match.currency_id = query.currency_id;

        return match;
    }

    private violationMatch(query: ReportsQueryDto): Record<string, unknown> {
        const match: Record<string, unknown> = { deleted_at: null };

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            match.violation_date = range;
        }
        if (query.branch_id) match.branch_id = query.branch_id;
        if (query.violation_type_id) {
            match.violation_type_id = query.violation_type_id;
        }

        return match;
    }

    private cacheKey(prefix: string, query: ReportsQueryDto): string {
        const normalized = JSON.stringify(query);

        return `reports:${prefix}:${Buffer.from(normalized).toString(
            'base64url',
        )}`;
    }

    private toCsv(headers: string[], rows: (string | number)[][]): string {
        const lines = [headers, ...rows].map((row) =>
            row.map((value) => this.csvCell(value)).join(','),
        );

        return `\uFEFF${lines.join('\r\n')}\r\n`;
    }

    private csvCell(value: string | number): string {
        const text = String(value ?? '');

        if (/[",\r\n]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }

        return text;
    }
}
