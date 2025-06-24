import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseStatusInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((result) => {
        if (result.failed.length > 0 && result.success.length > 0) {
          response.status(207); // Multi-Status
        } else if (result.failed.length > 0 && result.success.length === 0) {
          response.status(409); // Conflict
        } else if (result.success.length > 0 && result.failed.length === 0) {
          response.status(200); // OK
        }
        return result;
      }),
    );
  }
}
