import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { createReadStream, existsSync } from 'node:fs';
import type { ReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Attachment, AttachmentDocument } from './schemas/attachment.schema.js';
import { CreateAttachmentDto } from './dto/create-attachment.dto.js';
import { AttachmentsQueryDto } from './dto/attachments-query.dto.js';
import { Violation } from '../violations/schemas/violation.schema.js';
import { Objection } from '../objections/schemas/objection.schema.js';
import { Paginated } from '../../common/interfaces/pagination.interface.js';
import { paginate } from '../../common/utils/pagination.js';
import { AuditService } from '../audit/audit.service.js';
import { toAuditSnapshot } from '../../common/utils/audit-snapshot.js';

const NOT_FOUND = 'المرفق غير موجود';
const FILE_MISSING = 'الملف غير موجود على الخادم';
const VIOLATION_NOT_FOUND = 'المخالفة غير موجودة';
const OBJECTION_NOT_FOUND = 'الاعتراض غير موجود';
const RELATION_REQUIRED = 'يجب ربط الملف بمخالفة أو اعتراض';

export interface AttachmentDownload {
    attachment: AttachmentDocument;
    stream: ReadStream;
}

@Injectable()
export class AttachmentsService {
    constructor(
        @InjectModel(Attachment.name)
        private attachmentModel: Model<Attachment>,
        @InjectModel(Violation.name)
        private violationModel: Model<Violation>,
        @InjectModel(Objection.name)
        private objectionModel: Model<Objection>,
        private readonly auditService: AuditService,
    ) {}

    async create(
        dto: CreateAttachmentDto,
        file: Express.Multer.File,
    ): Promise<AttachmentDocument> {
        try {
            if (!dto.violation_id && !dto.objection_id) {
                throw new BadRequestException(RELATION_REQUIRED);
            }

            if (dto.violation_id) {
                const violation = await this.violationModel.exists({
                    _id: dto.violation_id,
                    deleted_at: null,
                });

                if (!violation) {
                    throw new NotFoundException(VIOLATION_NOT_FOUND);
                }
            }

            if (dto.objection_id) {
                const objection = await this.objectionModel.exists({
                    _id: dto.objection_id,
                    deleted_at: null,
                });

                if (!objection) {
                    throw new NotFoundException(OBJECTION_NOT_FOUND);
                }
            }

            const attachment = await this.attachmentModel.create({
                file_name: file.filename,
                original_name: file.originalname,
                mime_type: file.mimetype,
                size: file.size,
                path: `uploads/attachments/${file.filename}`,
                violation_id: dto.violation_id ?? null,
                objection_id: dto.objection_id ?? null,
            });

            await this.auditService.record({
                action: 'create',
                entityType: 'attachment',
                entityId: attachment.id,
                after: toAuditSnapshot(attachment),
            });

            return attachment;
        } catch (error) {
            await unlink(file.path).catch(() => undefined);
            throw error;
        }
    }

    async findAll(query: AttachmentsQueryDto): Promise<Paginated<Attachment>> {
        const filter: Record<string, unknown> = { deleted_at: null };

        if (query.violation_id) filter.violation_id = query.violation_id;
        if (query.objection_id) filter.objection_id = query.objection_id;
        if (query.mime_type) filter.mime_type = query.mime_type;

        if (query.from_date || query.to_date) {
            const range: Record<string, Date> = {};
            if (query.from_date) range.$gte = new Date(query.from_date);
            if (query.to_date) range.$lte = new Date(query.to_date);
            filter.created_at = range;
        }

        if (query.search) {
            filter.original_name = {
                $regex: this.escapeRegex(query.search),
                $options: 'i',
            };
        }

        return paginate(
            this.attachmentModel,
            filter as QueryFilter<Attachment>,
            query,
            { created_at: -1 },
        );
    }

    async findById(id: string): Promise<AttachmentDocument> {
        const attachment = await this.findDocument(id);

        await attachment.populate([
            {
                path: 'violation_id',
                select: 'violation_number status fine_amount',
            },
            {
                path: 'objection_id',
                select: 'reason status',
            },
        ]);

        return attachment;
    }

    async download(id: string): Promise<AttachmentDownload> {
        const attachment = await this.findDocument(id);
        const filePath = join(process.cwd(), attachment.path);

        if (!existsSync(filePath)) {
            throw new NotFoundException(FILE_MISSING);
        }

        return {
            attachment,
            stream: createReadStream(filePath),
        };
    }

    async remove(id: string): Promise<void> {
        const attachment = await this.findDocument(id);
        const before = toAuditSnapshot(attachment);

        await this.attachmentModel.updateOne(
            { _id: id, deleted_at: null },
            { deleted_at: new Date() },
        );

        await this.auditService.record({
            action: 'delete',
            entityType: 'attachment',
            entityId: attachment.id,
            before,
        });
    }

    private async findDocument(id: string): Promise<AttachmentDocument> {
        const attachment = await this.attachmentModel.findOne({
            _id: id,
            deleted_at: null,
        });

        if (!attachment) throw new NotFoundException(NOT_FOUND);

        return attachment;
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
