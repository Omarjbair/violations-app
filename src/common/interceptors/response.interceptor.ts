import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    StreamableFile,
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
export class ResponseInterceptor<T> implements NestInterceptor<
    T,
    ApiResponse<T> | StreamableFile
> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T> | StreamableFile> {
        const ctx = context.switchToHttp();
        const response = ctx.getResponse();
        const statusCode = response.statusCode;

        return next.handle().pipe(
            map((data): ApiResponse<T> | StreamableFile => {
                if (data instanceof StreamableFile) return data;

                return {
                    success: true,
                    statusCode,
                    data: data ?? null,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}
