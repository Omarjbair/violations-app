import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema.js';
import {
    Violation,
    ViolationSchema,
} from '../violations/schemas/violation.schema.js';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema.js';
import {
    Currency,
    CurrencySchema,
} from '../currencies/schemas/currency.schema.js';
import {
    ViolationType,
    ViolationTypeSchema,
} from '../violation-types/schemas/violation-type.schema.js';
import { Citizen, CitizenSchema } from '../citizens/schemas/citizen.schema.js';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Payment.name, schema: PaymentSchema },
            { name: Violation.name, schema: ViolationSchema },
            { name: Branch.name, schema: BranchSchema },
            { name: Currency.name, schema: CurrencySchema },
            { name: ViolationType.name, schema: ViolationTypeSchema },
            { name: Citizen.name, schema: CitizenSchema },
        ]),
    ],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule {}
