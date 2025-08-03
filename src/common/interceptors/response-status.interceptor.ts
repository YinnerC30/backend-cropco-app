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
        const failed = result.failed ?? [];
        const success = result.success ?? [];
        if (failed.length > 0 && success.length > 0) {
          response.status(207); // Multi-Status
        } else if (failed.length > 0 && success.length === 0) {
          response.status(409); // Conflict
        } else if (success.length > 0 && failed.length === 0) {
          response.status(200); // OK
        } else {
          response.status(200); // OK por defecto si no hay info
        }
        return result;
      }),
    );
  }
}
