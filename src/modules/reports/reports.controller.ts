import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import {
    ExportReportQueryDto,
    ReportsQueryDto,
} from './dto/reports-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('v1/reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @Get('revenue')
    @Roles(UserRole.ADMIN)
    revenue(@Query() query: ReportsQueryDto) {
        return this.reportsService.revenue(query);
    }

    @Get('violations')
    @Roles(UserRole.ADMIN)
    violations(@Query() query: ReportsQueryDto) {
        return this.reportsService.violations(query);
    }

    @Get('top-offenders')
    @Roles(UserRole.ADMIN)
    topOffenders(@Query() query: ReportsQueryDto) {
        return this.reportsService.topOffenders(query);
    }

    @Get('export')
    @Roles(UserRole.ADMIN)
    async export(
        @Query() query: ExportReportQueryDto,
        @Res({ passthrough: true }) response: Response,
    ): Promise<StreamableFile> {
        const { filename, csv } = await this.reportsService.exportCsv(
            query.report,
            query,
        );

        response.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        });

        return new StreamableFile(Buffer.from(csv, 'utf8'));
    }
}
