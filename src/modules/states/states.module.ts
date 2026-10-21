import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatesController } from './states.controller.js';
import { StatesService } from './states.service.js';
import { State, StateSchema } from './schemas/state.schema.js';
import { Address, AddressSchema } from '../addresses/schemas/address.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: State.name, schema: StateSchema },
            { name: Address.name, schema: AddressSchema },
        ]),
    ],
    controllers: [StatesController],
    providers: [StatesService],
    exports: [StatesService, MongooseModule],
})
export class StatesModule {}