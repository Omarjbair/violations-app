import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ViolationsController } from './violations.controller.js';
import { ViolationsService } from './violations.service.js';
import { Violation, ViolationSchema } from './schemas/violation.schema.js';
import { CitizensModule } from '../citizens/citizens.module.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { ViolationTypesModule } from '../violation-types/violation-types.module.js';
import { BranchesModule } from '../branches/branches.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Violation.name, schema: ViolationSchema },
        ]),
        CitizensModule,
        VehiclesModule,
        ViolationTypesModule,
        BranchesModule,
    ],
    controllers: [ViolationsController],
    providers: [ViolationsService],
    exports: [ViolationsService, MongooseModule],
})
export class ViolationsModule {}
