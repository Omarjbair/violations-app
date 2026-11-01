import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, jwtConfig } from './config/index.js';
import { envValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StatesModule } from './modules/states/states.module.js';
import { CitizensModule } from './modules/citizens/citizens.module.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { BranchesModule } from './modules/branches/branches.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { ViolationTypesModule } from './modules/violation-types/violation-types.module.js';
import { ViolationsModule } from './modules/violations/violations.module.js';
import { CurrenciesModule } from './modules/currencies/currencies.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { ObjectionsModule } from './modules/objections/objections.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, jwtConfig],
            validationSchema: envValidationSchema,
        }),
        DatabaseModule,
        AuthModule,
        UsersModule,
        StatesModule,
        AddressesModule,
        CitizensModule,
        BranchesModule,
        VehiclesModule,
        ViolationTypesModule,
        ViolationsModule,
        CurrenciesModule,
        PaymentsModule,
        ObjectionsModule,
    ],
})
export class AppModule {}
