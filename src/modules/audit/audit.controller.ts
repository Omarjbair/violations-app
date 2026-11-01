import { Controller, Get, Param, Query } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { AuditService } from './audit.service.js';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@Controller('v1/audit-logs')
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @Roles(UserRole.ADMIN)
    findAll(@Query() query: AuditLogsQueryDto) {
        return this.auditService.findAll(query);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.auditService.findById(id);
    }
}
