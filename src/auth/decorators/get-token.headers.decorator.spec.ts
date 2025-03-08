import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { getTokenFactory as GetToken } from './get-token.headers.decorator';

describe('GetToken Decorator', () => {
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ExecutionContext;
  });

  it('should correctly extract the token when it is present with lowercase “authorization”.', () => {
    mockRequest.headers['authorization'] = 'Bearer validToken123';
    const result = GetToken(null, mockExecutionContext);
    expect(result).toBe('validToken123');
  });

  it('should correctly extract the token when it is present with “Authorization” in uppercase letters', () => {
    mockRequest.headers['Authorization'] = 'Bearer validToken123';
    const result = GetToken(null, mockExecutionContext);
    expect(result).toBe('validToken123');
  });

  it('should throw UnauthorizedException when there is no authorization header', () => {
    expect(() => {
      GetToken(null, mockExecutionContext);
    }).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token format is incorrect (without “Bearer”)', () => {
    mockRequest.headers['authorization'] = 'InvalidToken123';
    expect(() => {
      GetToken(null, mockExecutionContext);
    }).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token format is incorrect (without token)', () => {
    mockRequest.headers['authorization'] = 'Bearer ';
    expect(() => {
      GetToken(null, mockExecutionContext);
    }).toThrow(UnauthorizedException);
  });

  it('should check for the correct error message when there is no token', () => {
    mockRequest.headers['authorization'] = 'Bearer ';
    try {
      GetToken(null, mockExecutionContext);
      fail('It was expected to launch an exception');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.message).toBe('Token not found in request');
    }
  });
});
