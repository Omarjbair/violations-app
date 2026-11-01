import {
    Inject,
    Injectable,
    Logger,
    OnApplicationShutdown,
    OnModuleInit,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import type { Redis } from 'ioredis';
import redisConfig from '../config/redis.config.js';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
    private readonly logger = new Logger(RedisService.name);
    private ready = false;

    constructor(
        @Inject(REDIS_CLIENT) private readonly client: Redis,
        @Inject(redisConfig.KEY)
        private readonly config: ConfigType<typeof redisConfig>,
    ) {
        this.client.on('error', (error: Error) => {
            if (this.ready) {
                this.logger.warn(`Redis error: ${error.message}`);
            }
        });
    }

    get cacheTtl(): number {
        return this.config.cacheTtl;
    }

    async onModuleInit(): Promise<void> {
        try {
            if (this.client.status === 'wait') {
                await this.client.connect();
            }

            await this.client.ping();
            this.ready = true;
        } catch (error) {
            this.ready = false;

            if (this.config.required) throw error;

            this.logger.warn(
                `Redis is unavailable at ${this.config.url}; caching and rate limiting will fall back, auth sessions will fail closed.`,
            );
        }
    }

    onApplicationShutdown(): void {
        this.client.disconnect();
    }

    isReady(): boolean {
        return this.ready;
    }

    async ping(): Promise<string> {
        return this.client.ping();
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(this.key(key));
    }

    async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds && ttlSeconds > 0) {
            await this.client.set(this.key(key), value, 'EX', ttlSeconds);
            return;
        }

        await this.client.set(this.key(key), value);
    }

    async del(key: string): Promise<void> {
        await this.client.del(this.key(key));
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(this.key(key));
    }

    async expire(key: string, seconds: number): Promise<void> {
        await this.client.expire(this.key(key), seconds);
    }

    async pttl(key: string): Promise<number> {
        return this.client.pttl(this.key(key));
    }

    async setJson<T>(
        key: string,
        value: T,
        ttlSeconds?: number,
    ): Promise<void> {
        await this.set(key, JSON.stringify(value), ttlSeconds);
    }

    async getOrSet<T>(
        key: string,
        ttlSeconds: number,
        loader: () => Promise<T>,
    ): Promise<T> {
        try {
            const cached = await this.get(key);

            if (cached !== null) {
                return JSON.parse(cached) as T;
            }
        } catch (error) {
            this.warn(error, `cache read failed for ${key}`);
        }

        const value = await loader();

        try {
            await this.setJson(key, value, ttlSeconds);
        } catch (error) {
            this.warn(error, `cache write failed for ${key}`);
        }

        return value;
    }

    async deleteByPrefix(prefix: string): Promise<void> {
        let cursor = '0';

        do {
            const [next, keys] = await this.client.scan(
                cursor,
                'MATCH',
                `${this.key(prefix)}*`,
                'COUNT',
                100,
            );

            cursor = next;

            if (keys.length > 0) {
                await this.client.unlink(...keys);
            }
        } while (cursor !== '0');
    }

    async invalidate(prefix: string): Promise<void> {
        try {
            await this.deleteByPrefix(prefix);
        } catch (error) {
            this.warn(error, `cache invalidation failed for ${prefix}`);
        }
    }

    private key(key: string): string {
        return `${this.config.keyPrefix}:${key}`;
    }

    private warn(error: unknown, message: string): void {
        const detail = error instanceof Error ? error.message : String(error);
        this.logger.warn(`${message}: ${detail}`);
    }
}
