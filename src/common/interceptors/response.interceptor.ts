import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            map((data) => ({ status: 200, message: 'Success', data: data ?? null })),
        );
    }
}
