import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
    url: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'viol',
    cacheTtl: parseInt(process.env.REDIS_CACHE_TTL ?? '300', 10),
    required: process.env.NODE_ENV === 'production',
}));
