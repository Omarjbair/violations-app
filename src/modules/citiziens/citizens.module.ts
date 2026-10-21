import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CitizensController } from './citizens.controller.js';
import { CitizensService } from './citizens.service.js';
import { Citizen, CitizenSchema } from './schemas/citizen.schema.js';
import { Address, AddressSchema } from '../addresses/schemas/address.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Citizen.name, schema: CitizenSchema },
            { name: Address.name, schema: AddressSchema },
        ]),
    ],
    controllers: [CitizensController],
    providers: [CitizensService],
    exports: [CitizensService, MongooseModule],
})
export class CitizensModule {}