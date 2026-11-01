import { Global, Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Redis } from 'ioredis';
import redisConfig from '../config/redis.config.js';
import { REDIS_CLIENT } from './redis.constants.js';
import { RedisService } from './redis.service.js';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [redisConfig.KEY],
            useFactory: (cfg: ConfigType<typeof redisConfig>) =>
                new Redis(cfg.url, {
                    lazyConnect: true,
                    enableOfflineQueue: false,
                    maxRetriesPerRequest: 1,
                    retryStrategy: (times) => (times > 2 ? null : 200),
                }),
        },
        RedisService,
    ],
    exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
