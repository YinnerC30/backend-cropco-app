import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthGuard } from '@nestjs/passport';
import { UserPermitsGuard } from '../guards/user-role/user-permits.guard';
import { Auth } from './auth.decorator';

// Mock AuthGuard
jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockResolvedValue(true),
  })),
}));

describe('Auth Decorator', () => {
  it('should apply UseGuards with correct guards', () => {
    // Create a mock target
    const target = {
      prototype: {},
      name: 'TestClass',
    };

    // Apply the Auth decorator
    Auth()(target);

    // Verify that UseGuards was called with both guards
    expect(AuthGuard).toHaveBeenCalledWith('jwt');
  });

  // Test actual guard integration
  it('should work with actual guards', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            first_name: 'John',
            modules: [
              {
                actions: [{ path_endpoint: '/test-path' }],
              },
            ],
          },
          route: {
            path: '/test-path',
          },
        }),
      }),
    } as ExecutionContext;

    const guard = new UserPermitsGuard(new Reflector());
    const result = await guard.canActivate(mockContext);

    expect(result).toBe(true);
  });
});
