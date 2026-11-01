import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

export const ATTACHMENTS_UPLOAD_DIR = join(
    process.cwd(),
    'uploads',
    'attachments',
);

export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const UNSUPPORTED_TYPE = 'نوع الملف غير مدعوم';

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const attachmentUploadOptions: MulterOptions = {
    storage: diskStorage({
        destination: (_req, _file, callback) => {
            mkdirSync(ATTACHMENTS_UPLOAD_DIR, { recursive: true });
            callback(null, ATTACHMENTS_UPLOAD_DIR);
        },
        filename: (_req, file, callback) => {
            callback(
                null,
                `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
            );
        },
    }),
    limits: { fileSize: MAX_ATTACHMENT_SIZE },
    fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            callback(new BadRequestException(UNSUPPORTED_TYPE), false);
            return;
        }

        callback(null, true);
    },
};
