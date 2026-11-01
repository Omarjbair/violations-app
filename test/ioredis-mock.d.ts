declare module 'ioredis-mock' {
    import type { Redis } from 'ioredis';

    export default class RedisMock implements Partial<Redis> {
        constructor(options?: Record<string, unknown>);
        status: string;
        connect(): Promise<void>;
        disconnect(): void;
        ping(): Promise<string>;
        get(key: string): Promise<string | null>;
        set(...args: unknown[]): Promise<unknown>;
        del(...keys: string[]): Promise<number>;
        incr(key: string): Promise<number>;
        expire(key: string, seconds: number): Promise<number>;
        pttl(key: string): Promise<number>;
        scan(cursor: string, ...args: unknown[]): Promise<[string, string[]]>;
        unlink(...keys: string[]): Promise<number>;
        on(event: string, listener: (...args: unknown[]) => void): this;
    }
}
