import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getTokenFactory as GetToken } from './get-token.headers.decorator';

describe('GetToken Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  it('should correctly extract the token when it is present in the user-token cookie', () => {
    mockRequest.cookies['user-token'] = 'validToken123';
    const result = GetToken(null, mockExecutionContext);
    expect(result).toBe('validToken123');
  });

  it('should throw UnauthorizedException when there is no user-token cookie', () => {
    expect(() => {
      GetToken(null, mockExecutionContext);
    }).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException with correct message when there is no token', () => {
    try {
      GetToken(null, mockExecutionContext);
      fail('It was expected to launch an exception');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Token not found in request');
    }
  });
});
