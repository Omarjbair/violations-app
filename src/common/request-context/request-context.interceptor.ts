import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, defer } from 'rxjs';
import { RequestContextService } from './request-context.service.js';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
    constructor(private readonly context: RequestContextService) {}

    intercept(
        executionContext: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const request = executionContext.switchToHttp().getRequest<Request>();
        const actor = request.user as { id?: string } | undefined;
        const store = {
            actorId: actor?.id ?? null,
            ip: request.ip ?? request.socket?.remoteAddress ?? null,
            userAgent: request.headers['user-agent'] ?? null,
        };

        return defer(() => this.context.run(store, () => next.handle()));
    }
}
