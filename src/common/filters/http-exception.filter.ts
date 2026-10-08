// src/common/filters/http-exception.filter.ts
import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
    success: boolean;
    statusCode: number;
    message: string | string[];
    path: string;
    timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Determine HTTP status
        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        // Extract message from HttpException (handles both string and validation array)
        let message: string | string[] = 'حدث خطأ غير متوقع في الخادم';
        if (exception instanceof HttpException) {
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
            } else if (typeof res === 'object' && res !== null) {
                message = (res as any).message ?? message;
            }
        }

        // Log server-side errors (5xx) with full stack for debugging
        if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(
                `${request.method} ${request.url} - ${status}`,
                exception instanceof Error ? exception.stack : undefined,
            );
        }

        const errorResponse: ErrorResponse = {
            success: false,
            statusCode: status,
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        };

        response.status(status).json(errorResponse);
    }
}