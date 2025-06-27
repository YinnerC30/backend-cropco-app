import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CookiesLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CookiesLoggerInterceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    // Obtener cookies del request
    const cookies = request.cookies || {};
    const cookieHeader = request.headers.cookie;
    const signedCookies = request.signedCookies || {};
    
    // Log de cookies
    this.logger.log(`=== COOKIES EN PETICIÓN ${method} ${url} ===`);
    
    // Mostrar headers relacionados con cookies
    this.logger.log('Headers relacionados con cookies:');
    Object.keys(request.headers).forEach(header => {
      if (header.toLowerCase().includes('cookie')) {
        this.logger.log(`  ${header}: ${request.headers[header]}`);
      }
    });
    
    if (Object.keys(cookies).length > 0) {
      this.logger.log('Cookies parseadas:');
      Object.entries(cookies).forEach(([name, value]) => {
        this.logger.log(`  ${name}: ${value}`);
      });
    } else {
      this.logger.log('No hay cookies parseadas');
    }
    
    if (Object.keys(signedCookies).length > 0) {
      this.logger.log('Cookies firmadas:');
      Object.entries(signedCookies).forEach(([name, value]) => {
        this.logger.log(`  ${name}: ${value}`);
      });
    }
    
    if (cookieHeader) {
      this.logger.log('Cookie header raw:');
      this.logger.log(`  ${cookieHeader}`);
    } else {
      this.logger.log('No hay cookie header');
    }
    
    this.logger.log('=== FIN COOKIES ===');

    return next.handle().pipe(
      tap(() => {
        // También podemos loggear cookies de respuesta si es necesario
        const response = context.switchToHttp().getResponse();
        const setCookieHeaders = response.getHeaders()['set-cookie'];
        
        if (setCookieHeaders) {
          this.logger.log('=== COOKIES EN RESPUESTA ===');
          this.logger.log('Set-Cookie headers:');
          setCookieHeaders.forEach((cookie: string) => {
            this.logger.log(`  ${cookie}`);
          });
          this.logger.log('=== FIN COOKIES RESPUESTA ===');
        }
      })
    );
  }
} 