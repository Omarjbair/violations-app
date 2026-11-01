import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsService } from './attachments.service.js';
import { Attachment, AttachmentSchema } from './schemas/attachment.schema.js';
import { ViolationsModule } from '../violations/violations.module.js';
import { ObjectionsModule } from '../objections/objections.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Attachment.name, schema: AttachmentSchema },
        ]),
        ViolationsModule,
        ObjectionsModule,
    ],
    controllers: [AttachmentsController],
    providers: [AttachmentsService],
    exports: [AttachmentsService, MongooseModule],
})
export class AttachmentsModule {}
