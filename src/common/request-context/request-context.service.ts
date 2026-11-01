import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestStore {
    actorId: string | null;
    ip: string | null;
    userAgent: string | null;
}

@Injectable()
export class RequestContextService {
    private readonly storage = new AsyncLocalStorage<RequestStore>();

    run<T>(store: RequestStore, callback: () => T): T {
        return this.storage.run(store, callback);
    }

    getStore(): RequestStore | undefined {
        return this.storage.getStore();
    }
}
