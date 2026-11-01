import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VehiclesController } from './vehicles.controller.js';
import { VehiclesService } from './vehicles.service.js';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema.js';
import {
    VehicleOwner,
    VehicleOwnerSchema,
} from './schemas/vehicle-owner.schema.js';
import { CitizensModule } from '../citizens/citizens.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Vehicle.name, schema: VehicleSchema },
            { name: VehicleOwner.name, schema: VehicleOwnerSchema },
        ]),
        CitizensModule,
    ],
    controllers: [VehiclesController],
    providers: [VehiclesService],
    exports: [VehiclesService, MongooseModule],
})
export class VehiclesModule {}
