import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';
import { AuditLogsQueryDto } from './dto/audit-logs-query.dto.js';
import { RequestContextService } from '../../common/request-context/request-context.service.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';

const NOT_FOUND = 'السجل غير موجود';

export interface AuditEntry {
    action: string;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectModel(AuditLog.name)
        private auditLogModel: Model<AuditLog>,
        private readonly requestContext: RequestContextService,
    ) {}

    async record(entry: AuditEntry): Promise<void> {
        const context = this.requestContext.getStore();

        try {
            await this.auditLogModel.create({
                actor_id: context?.actorId ?? null,
                action: entry.action,
                entity_type: entry.entityType,
                entity_id: entry.entityId,
                before: entry.before ?? null,
                after: entry.after ?? null,
                ip: context?.ip ?? null,
                user_agent: context?.userAgent ?? null,
            });
        } catch (error) {
            const detail =
                error instanceof Error ? error.message : String(error);
            this.logger.error(
                `Failed to write audit log for ${entry.entityType}:${entry.entityId} - ${detail}`,
            );
        }
    }

    async findAll(query: AuditLogsQueryDto): Promise<Paginated<AuditLog>> {
        const filter: Record<string, unknown> = {};

        if (query.actor_id) filter.actor_id = query.actor_id;
        if (query.action) filter.action = query.action;
        if (query.entity_type) filter.entity_type = query.entity_type;
        if (query.entity_id) filter.entity_id = query.entity_id;

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.created_at = range;
        }

        return paginate(
            this.auditLogModel,
            filter as QueryFilter<AuditLog>,
            query,
            { created_at: -1 },
        );
    }

    async findById(id: string): Promise<AuditLogDocument> {
        const auditLog = await this.auditLogModel
            .findById(id)
            .populate('actor_id', 'username first_name last_name');

        if (!auditLog) throw new NotFoundException(NOT_FOUND);

        return auditLog;
    }
}
