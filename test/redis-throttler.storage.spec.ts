import type { ConfigType } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { RedisService } from '../src/redis/redis.service.js';
import { RedisThrottlerStorage } from '../src/redis/redis-throttler.storage.js';
import redisConfig from '../src/config/redis.config.js';

async function createStorage(): Promise<{
    service: RedisService;
    storage: RedisThrottlerStorage;
}> {
    const client = new RedisMock() as unknown as Redis;
    const config = {
        url: 'redis://localhost:6379',
        keyPrefix: 'test',
        cacheTtl: 60,
        required: false,
    } as ConfigType<typeof redisConfig>;
    const service = new RedisService(client, config);

    await service.onModuleInit();

    return { service, storage: new RedisThrottlerStorage(service) };
}

describe('RedisThrottlerStorage', () => {
    it('counts hits and blocks after the limit', async () => {
        const { service, storage } = await createStorage();

        try {
            const first = await storage.increment(
                '127.0.0.1',
                60_000,
                2,
                60_000,
                'default',
            );
            const second = await storage.increment(
                '127.0.0.1',
                60_000,
                2,
                60_000,
                'default',
            );
            const third = await storage.increment(
                '127.0.0.1',
                60_000,
                2,
                60_000,
                'default',
            );

            expect(first.totalHits).toBe(1);
            expect(first.isBlocked).toBe(false);
            expect(second.totalHits).toBe(2);
            expect(second.isBlocked).toBe(false);
            expect(third.totalHits).toBe(3);
            expect(third.isBlocked).toBe(true);
            expect(third.timeToBlockExpire).toBeGreaterThan(0);
        } finally {
            service.onApplicationShutdown();
        }
    });

    it('fails open when redis errors', async () => {
        const failingService = {
            incr: vi.fn().mockRejectedValue(new Error('redis down')),
        } as unknown as RedisService;
        const storage = new RedisThrottlerStorage(failingService);

        const result = await storage.increment(
            '127.0.0.1',
            60_000,
            2,
            60_000,
            'default',
        );

        expect(result).toEqual({
            totalHits: 0,
            timeToExpire: 0,
            isBlocked: false,
            timeToBlockExpire: 0,
        });
    });
});
