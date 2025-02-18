import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserPermitsGuard } from './user-permits.guard';
import {
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('UserPermitsGuard', () => {
  let guard: UserPermitsGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPermitsGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<UserPermitsGuard>(UserPermitsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should throw BadRequestException if user is not found in the request', () => {
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({})), // Simulamos una solicitud sin usuario
        })),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrowError(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user does not have permission for the requested path', () => {
      const mockUser = {
        first_name: 'John',
        modules: [
          {
            actions: [{ path_endpoint: '/allowed-path' }],
          },
        ],
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: mockUser,
            route: { path: '/forbidden-path' }, // Ruta no permitida
          })),
        })),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrowError(
        `User ${mockUser.first_name} need a permit for this action`,
      );
    });

    it('should return true if user has permission for the requested path', () => {
      const mockUser = {
        first_name: 'John',
        modules: [
          {
            actions: [{ path_endpoint: '/allowed-path' }],
          },
        ],
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: mockUser,
            route: { path: '/allowed-path' }, // Ruta permitida
          })),
        })),
      } as unknown as ExecutionContext;

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
