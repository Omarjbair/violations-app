import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, jwtConfig } from './config/index.js';
import { envValidationSchema } from './config/env.validation.js';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './modules/users/users.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    UsersModule,
  ],

})
export class AppModule {}