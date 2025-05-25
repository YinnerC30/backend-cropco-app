import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UserPermitsGuard } from './user-permits.guard';
import {
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AUTH_OPTIONS_KEY } from 'src/auth/decorators/auth.decorator';

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
          getRequest: jest.fn(() => ({})), // req.user no existe
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
        if (key === AUTH_OPTIONS_KEY) return undefined;
        return null;
      });

      expect(() => guard.canActivate(mockContext)).toThrowError(
        BadRequestException,
      );
    });

    it('should return true if skipValidationPath is true', () => {
      const mockUser = {
        first_name: 'John',
        modules: [],
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: mockUser,
            route: { path: '/any-path' }, // ruta cualquiera
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
        if (key === AUTH_OPTIONS_KEY) return { skipValidationPath: true }; // opción activada
        return null;
      });

      expect(guard.canActivate(mockContext)).toBe(true);
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
            route: { path: '/forbidden-path' }, // ruta no permitida
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
        if (key === AUTH_OPTIONS_KEY) return undefined; // no se salta validación
        return null;
      });

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
            route: { path: '/allowed-path' }, // ruta permitida
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any as ExecutionContext;

      jest.spyOn(reflector, 'get').mockImplementation((key: string) => {
        if (key === AUTH_OPTIONS_KEY) return undefined; // no se salta validación
        return null;
      });

      expect(guard.canActivate(mockContext)).toBe(true);
    });
  });
});
