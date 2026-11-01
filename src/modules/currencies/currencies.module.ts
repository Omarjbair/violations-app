import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CurrenciesController } from './currencies.controller.js';
import { CurrenciesService } from './currencies.service.js';
import { Currency, CurrencySchema } from './schemas/currency.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Currency.name, schema: CurrencySchema },
        ]),
    ],
    controllers: [CurrenciesController],
    providers: [CurrenciesService],
    exports: [CurrenciesService, MongooseModule],
})
export class CurrenciesModule {}
