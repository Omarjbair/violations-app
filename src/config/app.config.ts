import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3500', 10),
    globalPrefix: 'api',
}));