import { ExecutionContext } from '@nestjs/common';
import { getPropertyFromTokenFactory } from './get-property-from-user-token.decorator';

describe('getPropertyFromTokenFactory', () => {
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;
  });

  it('should return null if authorization header is missing', () => {
    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBeNull();
  });

  it('should return null if token is missing in authorization header', () => {
    mockExecutionContext.switchToHttp().getRequest().headers['authorization'] =
      'Bearer ';
    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBeNull();
  });

  it('should return null if token is invalid', () => {
    mockExecutionContext.switchToHttp().getRequest().headers['authorization'] =
      'Bearer invalid.token';
    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBeNull();
  });

  it('should return the specified property from the decoded token', () => {
    const mockTokenPayload = { property: 'value' };
    const mockToken = `header.${Buffer.from(JSON.stringify(mockTokenPayload)).toString('base64')}.signature`;
    mockExecutionContext.switchToHttp().getRequest().headers['authorization'] =
      `Bearer ${mockToken}`;

    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBe('value');
  });

  it('should return null if the specified property does not exist in the decoded token', () => {
    const mockTokenPayload = { anotherProperty: 'value' };
    const mockToken = `header.${Buffer.from(JSON.stringify(mockTokenPayload)).toString('base64')}.signature`;
    mockExecutionContext.switchToHttp().getRequest().headers['authorization'] =
      `Bearer ${mockToken}`;

    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBeNull();
  });

  it('should handle errors gracefully and return null', () => {
    mockExecutionContext.switchToHttp().getRequest().headers['authorization'] =
      'Bearer malformed.token';
    const result = getPropertyFromTokenFactory(
      'property',
      mockExecutionContext,
    );
    expect(result).toBeNull();
  });
});
