import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { Payment, PaymentSchema } from './schemas/payment.schema.js';
import { CurrenciesModule } from '../currencies/currencies.module.js';
import { BranchesModule } from '../branches/branches.module.js';
import { ViolationsModule } from '../violations/violations.module.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Payment.name, schema: PaymentSchema },
        ]),
        CurrenciesModule,
        BranchesModule,
        ViolationsModule,
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService, MongooseModule],
})
export class PaymentsModule {}
