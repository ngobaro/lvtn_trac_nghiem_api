import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body: any = exception.getResponse();
      message = typeof body === 'string' ? body : body.message || message;
      if (Array.isArray(body.message)) {
        errors = body.message;
        message = 'Validation error';
      }
    }

    res.status(status).json({ status, message, ...(errors ? { errors } : {}) });
  }
}
