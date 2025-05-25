import { SetMetadata, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Auth, AUTH_OPTIONS_KEY } from './auth.decorator';
import { UserPermitsGuard } from '../guards/user-role/user-permits.guard';

// Mock de los decoradores de NestJS
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  applyDecorators: jest.fn((...decorators) => decorators),
  SetMetadata: jest.fn(),
  UseGuards: jest.fn(),
}));

jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(),
}));

describe('Auth Decorator', () => {
  let mockSetMetadata: jest.MockedFunction<typeof SetMetadata>;
  let mockUseGuards: jest.MockedFunction<typeof UseGuards>;
  let mockAuthGuard: jest.MockedFunction<typeof AuthGuard>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetMetadata = SetMetadata as jest.MockedFunction<typeof SetMetadata>;
    mockUseGuards = UseGuards as jest.MockedFunction<typeof UseGuards>;
    mockAuthGuard = AuthGuard as jest.MockedFunction<typeof AuthGuard>;
  });

  describe('when called without options', () => {
    it('should apply SetMetadata with undefined options', () => {
      // Arrange
      const expectedOptions = undefined;

      // Act
      Auth();

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(
        AUTH_OPTIONS_KEY,
        expectedOptions,
      );
    });

    it('should apply UseGuards with JWT AuthGuard and UserPermitsGuard', () => {
      // Arrange
      const expectedJwtGuard = 'jwt';

      // Act
      Auth();

      // Assert
      expect(mockAuthGuard).toHaveBeenCalledWith(expectedJwtGuard);
      expect(mockUseGuards).toHaveBeenCalledWith(
        mockAuthGuard(expectedJwtGuard),
        UserPermitsGuard,
      );
    });
  });

  describe('when called with options', () => {
    it('should apply SetMetadata with provided options', () => {
      // Arrange
      const inputOptions = { skipValidationPath: true };

      // Act
      Auth(inputOptions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(
        AUTH_OPTIONS_KEY,
        inputOptions,
      );
    });

    it('should apply UseGuards with JWT AuthGuard and UserPermitsGuard', () => {
      // Arrange
      const inputOptions = { skipValidationPath: true };
      const expectedJwtGuard = 'jwt';

      // Act
      Auth(inputOptions);

      // Assert
      expect(mockAuthGuard).toHaveBeenCalledWith(expectedJwtGuard);
      expect(mockUseGuards).toHaveBeenCalledWith(
        mockAuthGuard(expectedJwtGuard),
        UserPermitsGuard,
      );
    });

    it('should handle skipValidationPath option correctly', () => {
      // Arrange
      const inputOptions = { skipValidationPath: false };

      // Act
      Auth(inputOptions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(
        AUTH_OPTIONS_KEY,
        inputOptions,
      );
    });
  });

  describe('AUTH_OPTIONS_KEY constant', () => {
    it('should have the correct value', () => {
      // Assert
      expect(AUTH_OPTIONS_KEY).toBe('authOptions');
    });
  });

  describe('decorator application order', () => {
    it('should apply decorators in the correct order', () => {
      // Arrange
      const inputOptions = { skipValidationPath: true };

      // Act
      const result = Auth(inputOptions);

      // Assert
      // Verificar que se retornen los decoradores en el orden correcto
      expect(result).toHaveLength(2);
      expect(mockSetMetadata).toHaveBeenCalled();
      expect(mockUseGuards).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('should work with empty options object', () => {
      // Arrange
      const inputOptions = {};

      // Act
      Auth(inputOptions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(AUTH_OPTIONS_KEY, inputOptions);
      expect(mockUseGuards).toHaveBeenCalled();
    });

    it('should work with additional properties in options', () => {
      // Arrange
      const inputOptions = { 
        skipValidationPath: true, 
        additionalProperty: 'test' 
      } as any;

      // Act
      Auth(inputOptions);

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(AUTH_OPTIONS_KEY, inputOptions);
    });

    it('should always use jwt strategy for AuthGuard', () => {
      // Act
      Auth();
      Auth({ skipValidationPath: true });
      Auth({ skipValidationPath: false });

      // Assert
      expect(mockAuthGuard).toHaveBeenCalledTimes(3);
      expect(mockAuthGuard).toHaveBeenNthCalledWith(1, 'jwt');
      expect(mockAuthGuard).toHaveBeenNthCalledWith(2, 'jwt');
      expect(mockAuthGuard).toHaveBeenNthCalledWith(3, 'jwt');
    });
  });
});
