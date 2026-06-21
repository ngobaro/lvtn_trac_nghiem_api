import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    // Nếu response đã được gửi thủ công (res.json/res.redirect), bỏ qua
    if (response.headersSent) {
      return next.handle();
    }

    const message = this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) || 'Success';

    return next.handle().pipe(
      map((data) => {
        // Check lần 2 sau khi handle() chạy xong
        if (response.headersSent) return;

        const statusCode = response.statusCode;
        return {
          status: statusCode,
          message,
          data: data ?? null,
        };
      }),
    );
  }
}