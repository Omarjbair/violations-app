import { Module } from '@nestjs/common';
import { StatesController } from './states.controller.js';
import { StatesService } from './states.service.js';
import { State, StateSchema } from './schemas/state.schema.js';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
    imports: [MongooseModule.forFeature([{ name: State.name, schema: StateSchema }])],
    controllers: [StatesController],
    providers: [StatesService],
    exports: [StatesService],
})
export class StatesModule {}