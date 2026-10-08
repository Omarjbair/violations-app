import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    data: T;
    timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>>
{
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const statusCode = response.statusCode;

        return next.handle().pipe(
            map((data) => ({
                success: true,
                statusCode,
                data: data ?? null,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}