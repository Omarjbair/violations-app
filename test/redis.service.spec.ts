import type { ConfigType } from '@nestjs/config';
import RedisMock from 'ioredis-mock';
import type { Redis } from 'ioredis';
import { RedisService } from '../src/redis/redis.service.js';
import redisConfig from '../src/config/redis.config.js';

function createService(): RedisService {
    const client = new RedisMock() as unknown as Redis;
    const config = {
        url: 'redis://localhost:6379',
        keyPrefix: 'test',
        cacheTtl: 60,
        required: false,
    } as ConfigType<typeof redisConfig>;

    return new RedisService(client, config);
}

describe('RedisService', () => {
    let service: RedisService;

    beforeEach(async () => {
        service = createService();
        await service.onModuleInit();
    });

    afterEach(() => {
        service.onApplicationShutdown();
    });

    it('stores and reads values using the configured prefix', async () => {
        await service.set('profile', 'value');

        expect(await service.get('profile')).toBe('value');
        expect(service.isReady()).toBe(true);
    });

    it('caches loader results with getOrSet', async () => {
        const loader = vi.fn().mockResolvedValue({ total: 3 });

        const first = await service.getOrSet('report', 60, loader);
        const second = await service.getOrSet('report', 60, loader);

        expect(first).toEqual({ total: 3 });
        expect(second).toEqual({ total: 3 });
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('deletes keys by prefix without touching other keys', async () => {
        await service.setJson('cache:states:1', { id: 1 });
        await service.setJson('cache:states:2', { id: 2 });
        await service.setJson('sessions:user', { id: 'other' });

        await service.invalidate('cache:');

        expect(await service.get('cache:states:1')).toBeNull();
        expect(await service.get('cache:states:2')).toBeNull();
        expect(await service.get('sessions:user')).not.toBeNull();
    });

    it('increments counters', async () => {
        expect(await service.incr('counter')).toBe(1);
        expect(await service.incr('counter')).toBe(2);
    });
});
