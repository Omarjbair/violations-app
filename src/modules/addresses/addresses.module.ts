import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressesController } from './addresses.controller.js';
import { AddressesService } from './addresses.service.js';
import { Address, AddressSchema } from './schemas/address.schema.js';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema.js';
import { Citizen, CitizenSchema } from '../citizens/schemas/citizen.schema.js';
import { StatesModule } from '../states/states.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Address.name, schema: AddressSchema },
            { name: Branch.name, schema: BranchSchema },
            { name: Citizen.name, schema: CitizenSchema },
        ]),
        StatesModule,
    ],
    controllers: [AddressesController],
    providers: [AddressesService],
    exports: [AddressesService, MongooseModule],
})
export class AddressesModule {}
