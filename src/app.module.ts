import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import {
    appConfig,
    databaseConfig,
    jwtConfig,
    redisConfig,
} from './config/index.js';
import { envValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisModule } from './redis/redis.module.js';
import { RedisService } from './redis/redis.service.js';
import { RedisThrottlerStorage } from './redis/redis-throttler.storage.js';
import { RequestContextModule } from './common/request-context/request-context.module.js';
import { RequestContextInterceptor } from './common/request-context/request-context.interceptor.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
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
import { AttachmentsModule } from './modules/attachments/attachments.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, jwtConfig, redisConfig],
            validationSchema: envValidationSchema,
        }),
        RequestContextModule,
        RedisModule,
        AuditModule,
        ReportsModule,
        ThrottlerModule.forRootAsync({
            inject: [RedisService],
            useFactory: (redis: RedisService) => ({
                throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
                storage: new RedisThrottlerStorage(redis),
            }),
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
        AttachmentsModule,
        NotificationsModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    ],
})
export class AppModule {}
