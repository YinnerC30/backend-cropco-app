import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    renewToken: jest.fn(),
    checkAuthStatus: jest.fn(),
    createModuleWithActions: jest.fn(),
    findAllModules: jest.fn(),
    convertToAdmin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should call authService.login with correct DTO and return result', async () => {
      const loginUserDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResult = { token: 'mock-token', email: 'test@example.com' };

      mockAuthService.login.mockResolvedValue(mockResult);

      const result = await authController.login(loginUserDto);

      expect(authService.login).toHaveBeenCalledWith(loginUserDto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('renewToken', () => {
    it('should call authService.renewToken with token and return result', async () => {
      const mockToken = 'mock-token';
      const mockResult = { token: 'new-mock-token' };

      mockAuthService.renewToken.mockResolvedValue(mockResult);

      const result = await authController.renewToken(mockToken);

      expect(authService.renewToken).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockResult);
    });
  });

  describe('checkAuthStatus', () => {
    it('should call authService.checkAuthStatus with token and return result', async () => {
      const mockToken = 'mock-token';
      const mockResult = { message: 'Token valid', statusCode: 200 };

      mockAuthService.checkAuthStatus.mockResolvedValue(mockResult);

      const result = await authController.checkAuthStatus(mockToken);

      expect(authService.checkAuthStatus).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockResult);
    });
  });

  describe('createModuleWithActions', () => {
    it('should call authService.createModuleWithActions and return result', async () => {
      const mockResult = 'Modules created successfully';

      mockAuthService.createModuleWithActions.mockResolvedValue(mockResult);

      const result = await authController.createModuleWithActions();

      expect(authService.createModulesWithActions).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('findAllModules', () => {
    it('should call authService.findAllModules and return result', async () => {
      const mockModules = [{ name: 'auth', label: 'autenticación' }];

      mockAuthService.findAllModules.mockResolvedValue(mockModules);

      const result = await authController.findAllModules();

      expect(authService.findAllModules).toHaveBeenCalled();
      expect(result).toEqual(mockModules);
    });
  });

  describe('convertToAdmin', () => {
    it('should call authService.convertToAdmin with id and return result', async () => {
      const mockId = '1';
      const mockResult = { email: 'admin@example.com', modules: [] };

      mockAuthService.convertToAdmin.mockResolvedValue(mockResult);

      const result = await authController.convertToAdmin(mockId);

      expect(authService.convertToAdmin).toHaveBeenCalledWith(mockId);
      expect(result).toEqual(mockResult);
    });
  });
});
