import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { CookiesLoggerInterceptor } from './cookies-logger.interceptor';

describe('CookiesLoggerInterceptor', () => {
  let interceptor: CookiesLoggerInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CookiesLoggerInterceptor],
    }).compile();

    interceptor = module.get<CookiesLoggerInterceptor>(CookiesLoggerInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log cookies when present in request', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/test',
      cookies: {
        sessionId: 'abc123',
        userId: 'user456',
      },
      headers: {
        cookie: 'sessionId=abc123; userId=user456',
      },
      signedCookies: {},
    };

    const mockResponse = {
      getHeaders: jest.fn().mockReturnValue({}),
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    // Espiar el logger para verificar que se llama
    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith('=== COOKIES EN PETICIÓN GET /test ===');
      expect(logSpy).toHaveBeenCalledWith('Cookies parseadas:');
      expect(logSpy).toHaveBeenCalledWith('  sessionId: abc123');
      expect(logSpy).toHaveBeenCalledWith('  userId: user456');
      expect(logSpy).toHaveBeenCalledWith('=== FIN COOKIES ===');
      done();
    });
  });

  it('should handle request without cookies', (done) => {
    const mockRequest = {
      method: 'POST',
      url: '/api/test',
      cookies: {},
      headers: {},
      signedCookies: {},
    };

    const mockResponse = {
      getHeaders: jest.fn().mockReturnValue({}),
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({ data: 'test' }),
    } as CallHandler;

    const logSpy = jest.spyOn(interceptor['logger'], 'log');

    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith('=== COOKIES EN PETICIÓN POST /api/test ===');
      expect(logSpy).toHaveBeenCalledWith('No hay cookies parseadas');
      expect(logSpy).toHaveBeenCalledWith('No hay cookie header');
      done();
    });
  });
}); 