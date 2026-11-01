import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ObjectionsController } from './objections.controller.js';
import { ObjectionsService } from './objections.service.js';
import { Objection, ObjectionSchema } from './schemas/objection.schema.js';
import { CitizensModule } from '../citizens/citizens.module.js';
import { ViolationsModule } from '../violations/violations.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Objection.name, schema: ObjectionSchema },
        ]),
        CitizensModule,
        ViolationsModule,
    ],
    controllers: [ObjectionsController],
    providers: [ObjectionsService],
    exports: [ObjectionsService, MongooseModule],
})
export class ObjectionsModule {}
