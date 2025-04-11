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
          if (result.failed && result.failed.length > 0) {
            response.status(207); // Multi-Status
          } else {
            response.status(200); // OK
          }
          return result;
        }),
      );
    }
  }