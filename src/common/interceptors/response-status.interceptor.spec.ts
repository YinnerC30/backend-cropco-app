import { ResponseStatusInterceptor } from './response-status.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('ResponseStatusInterceptor', () => {
  let interceptor: ResponseStatusInterceptor;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
  };

  const mockContext = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
    }),
  } as unknown as ExecutionContext;

  const createCallHandler = (data: any): CallHandler => ({
    handle: () => of(data),
  });

  beforeEach(() => {
    interceptor = new ResponseStatusInterceptor();
    jest.clearAllMocks();
  });

  it('debe devolver status 200 si no hay errores', (done) => {
    const callHandler = createCallHandler({ data: 'ok', failed: [] });

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ data: 'ok', failed: [] });
      done();
    });
  });

  it('debe devolver status 207 si hay errores en failed', (done) => {
    const callHandler = createCallHandler({
      data: 'parcial',
      failed: ['error1'],
    });

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(mockResponse.status).toHaveBeenCalledWith(207);
      expect(result).toEqual({ data: 'parcial', failed: ['error1'] });
      done();
    });
  });

  it('debe devolver status 200 si failed es undefined', (done) => {
    const callHandler = createCallHandler({ data: 'sin failed' });

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(result).toEqual({ data: 'sin failed' });
      done();
    });
  });
});
