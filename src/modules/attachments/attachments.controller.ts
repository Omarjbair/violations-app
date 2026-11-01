import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AttachmentsService } from './attachments.service.js';
import { CreateAttachmentDto } from './dto/create-attachment.dto.js';
import { AttachmentsQueryDto } from './dto/attachments-query.dto.js';
import { attachmentUploadOptions } from './attachments.storage.js';
import { UserRole } from '../users/schemas/user.schema.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

const FILE_REQUIRED = 'الملف مطلوب';

@Controller('v1/attachments')
export class AttachmentsController {
    constructor(private readonly attachmentsService: AttachmentsService) {}

    @Get()
    @Roles(UserRole.ADMIN, UserRole.USER)
    findAll(@Query() query: AttachmentsQueryDto) {
        return this.attachmentsService.findAll(query);
    }

    @Get(':id/download')
    @Roles(UserRole.ADMIN, UserRole.USER)
    async download(
        @Param('id', ParseObjectIdPipe) id: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { attachment, stream } =
            await this.attachmentsService.download(id);

        res.set({
            'Content-Type': attachment.mime_type,
            'Content-Disposition': `attachment; filename="${attachment.file_name}"; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`,
        });

        return new StreamableFile(stream);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.USER)
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.attachmentsService.findById(id);
    }

    @Post()
    @Roles(UserRole.ADMIN, UserRole.USER)
    @UseInterceptors(FileInterceptor('file', attachmentUploadOptions))
    create(
        @UploadedFile() file: Express.Multer.File | undefined,
        @Body() createAttachmentDto: CreateAttachmentDto,
    ) {
        if (!file) throw new BadRequestException(FILE_REQUIRED);

        return this.attachmentsService.create(createAttachmentDto, file);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(204)
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.attachmentsService.remove(id);
    }
}
