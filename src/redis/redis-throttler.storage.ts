import type { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service.js';

interface ThrottlerStorageRecord {
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
}

export class RedisThrottlerStorage implements ThrottlerStorage {
    constructor(private readonly redis: RedisService) {}

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const storageKey = `throttle:${throttlerName}:${key}`;
        const blockKey = `${storageKey}:blocked`;

        try {
            const totalHits = await this.redis.incr(storageKey);

            if (totalHits === 1) {
                await this.redis.expire(storageKey, this.toSeconds(ttl));
            }

            const remainingTtl = await this.redis.pttl(storageKey);
            const timeToExpire = this.toSeconds(Math.max(0, remainingTtl));

            let isBlocked = false;
            let timeToBlockExpire = 0;

            if (totalHits > limit) {
                if (blockDuration > 0) {
                    await this.redis.set(
                        blockKey,
                        '1',
                        this.toSeconds(blockDuration),
                    );

                    const blockTtl = await this.redis.pttl(blockKey);
                    timeToBlockExpire = this.toSeconds(Math.max(0, blockTtl));
                }

                isBlocked = true;
            } else {
                const blockTtl = await this.redis.pttl(blockKey);

                if (blockTtl > 0) {
                    isBlocked = true;
                    timeToBlockExpire = this.toSeconds(blockTtl);
                }
            }

            return {
                totalHits,
                timeToExpire,
                isBlocked,
                timeToBlockExpire,
            };
        } catch {
            return {
                totalHits: 0,
                timeToExpire: 0,
                isBlocked: false,
                timeToBlockExpire: 0,
            };
        }
    }

    private toSeconds(milliseconds: number): number {
        return Math.max(1, Math.ceil(milliseconds / 1000));
    }
}
