import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ViolationTypesController } from './violation-types.controller.js';
import { ViolationTypesService } from './violation-types.service.js';
import {
    ViolationType,
    ViolationTypeSchema,
} from './schemas/violation-type.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ViolationType.name, schema: ViolationTypeSchema },
        ]),
    ],
    controllers: [ViolationTypesController],
    providers: [ViolationTypesService],
    exports: [ViolationTypesService, MongooseModule],
})
export class ViolationTypesModule {}
