import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { Module } from './entities/module.entity';
import { ModuleActions } from './entities/module-actions.entity';
import { UsersService } from '../users/users.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let moduleRepository: Repository<Module>;
  let moduleActionsRepository: Repository<ModuleActions>;
  let jwtService: JwtService;
  let usersService: UsersService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockModuleRepository = {
    find: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockModuleActionsRepository = {
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Module),
          useValue: mockModuleRepository,
        },
        {
          provide: getRepositoryToken(ModuleActions),
          useValue: mockModuleActionsRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    moduleRepository = module.get<Repository<Module>>(
      getRepositoryToken(Module),
    );
    moduleActionsRepository = module.get<Repository<ModuleActions>>(
      getRepositoryToken(ModuleActions),
    );
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      password: 'hashedPassword',
      first_name: 'Test',
      last_name: 'User',
      is_active: true,
    };

    const mockUserPermits = [
      {
        name: 'module1',
        label: 'Module 1',
        actions: [
          {
            id: '1',
            description: 'Action 1',
            path_endpoint: '/test',
            name: 'test',
          },
        ],
      },
    ];

    beforeEach(() => {
      // Reset bcrypt mock before each test
      (bcrypt.compareSync as jest.Mock).mockReset();
    });

    it('should successfully login a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockModuleRepository.find.mockResolvedValue(mockUserPermits);
      mockJwtService.sign.mockReturnValue('mock-token');
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        ...mockUser,
        password: undefined,
        modules: mockUserPermits,
        token: 'mock-token',
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      mockUserRepository.findOne.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw ForbiddenException when user has no permits', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      mockModuleRepository.find.mockResolvedValue([]);

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkAuthStatus', () => {
    it('should return valid status for valid token', async () => {
      mockJwtService.verify.mockReturnValue({ id: '1' });

      const result = await service.checkAuthStatus('valid-token');

      expect(result).toEqual({
        message: 'Token valid',
        statusCode: 200,
      });
    });

    it('should throw UnauthorizedException for expired token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new TokenExpiredError('Token expired', new Date());
      });

      await expect(service.checkAuthStatus('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.checkAuthStatus('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('renewToken', () => {
    it('should renew token successfully', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      const payload = { id: '1' };

      mockJwtService.verify.mockReturnValue(payload);
      mockJwtService.sign.mockReturnValue(newToken);

      const result = await service.renewToken(oldToken);

      expect(result).toEqual({ token: newToken });
      expect(jwtService.verify).toHaveBeenCalledWith(oldToken);
      expect(jwtService.sign).toHaveBeenCalledWith(payload);
    });
  });

  describe('createModuleWithActions', () => {
    it('should create modules with their actions', async () => {
      mockModuleRepository.create.mockImplementation((dto) => dto);
      mockModuleActionsRepository.create.mockImplementation((dto) => dto);
      mockModuleRepository.save.mockImplementation((dto) =>
        Promise.resolve(dto),
      );

      await service.createModuleWithActions();

      expect(mockModuleRepository.delete).toHaveBeenCalledWith({});
      expect(mockModuleRepository.create).toHaveBeenCalled();
      expect(mockModuleActionsRepository.create).toHaveBeenCalled();
      expect(mockModuleRepository.save).toHaveBeenCalled();
    });
  });

  describe('findAllModules', () => {
    const mockModules = [
      {
        id: '1',
        name: 'module1',
        label: 'Module 1',
        actions: [
          {
            id: '1',
            name: 'action1',
            description: 'Action 1',
            path_endpoint: '/test1',
          },
        ],
      },
    ];

    it('should return all modules with their actions', async () => {
      mockModuleRepository.find.mockResolvedValue(mockModules);

      const result = await service.findAllModules();

      expect(result).toEqual(mockModules);
      expect(mockModuleRepository.find).toHaveBeenCalledWith({
        relations: { actions: true },
      });
    });
  });

  // describe('convertToAdmin', () => {
  //   const userId = '1';
  //   const mockUser = {
  //     id: userId,
  //     first_name: 'Test',
  //     last_name: 'Admin',
  //     modules: [],
  //   };

  //   const mockActions = [{ id: '1' }, { id: '2' }];

  //   it('should convert a user to admin successfully', async () => {
  //     mockUsersService.findOne.mockResolvedValue(mockUser);
  //     mockModuleActionsRepository.find.mockResolvedValue(mockActions);
  //     mockUsersService.update.mockResolvedValue({
  //       ...mockUser,
  //       actions: mockActions,
  //     });

  //     const result = await service.convertToAdmin(userId);

  //     expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
  //     expect(mockModuleActionsRepository.find).toHaveBeenCalledWith({
  //       select: { id: true },
  //     });
  //     expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
  //       ...mockUser,
  //       actions: mockActions,
  //     });
  //     expect(result).toEqual({ ...mockUser, actions: mockActions });
  //   });
  // });

  describe('convertToAdmin', () => {
    const userId = '1';
    const mockUser = {
      id: userId,
      first_name: 'Test',
      last_name: 'Admin',
    };

    const mockActions = [{ id: '1' }, { id: '2' }];

    it('should convert a user to admin successfully', async () => {
      mockUsersService.findOne.mockResolvedValue({ ...mockUser, modules: [] });
      mockModuleActionsRepository.find.mockResolvedValue(mockActions);
      mockUsersService.update.mockResolvedValue({
        ...mockUser,
        actions: mockActions,
      });

      const result = await service.convertToAdmin(userId);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(userId);
      expect(mockModuleActionsRepository.find).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        id: userId,
        first_name: 'Test',
        last_name: 'Admin',
        actions: mockActions,
      });
      expect(result).toEqual({ ...mockUser, actions: mockActions });
    });
  });

  describe('convertToAdminUserSeed', () => {
    const mockNewUser = {
      id: '1',
      first_name: 'demo name',
      last_name: 'demo lastname',
      email: 'demouser@example.com',
      cell_phone_number: '3001234567',
      is_active: true,
      modules: [],
    };

    const mockActions = [{ id: '1' }, { id: '2' }];

    it('should create and convert a seed user to admin', async () => {
      mockUsersService.create.mockResolvedValue(mockNewUser);
      mockModuleActionsRepository.find.mockResolvedValue(mockActions);
      mockUsersService.update.mockResolvedValue({
        ...mockNewUser,
        actions: mockActions,
      });

      const result = await service.convertToAdminUserSeed();

      expect(mockUsersService.create).toHaveBeenCalledWith({
        first_name: 'demo name',
        last_name: 'demo lastname',
        email: 'demouser@example.com',
        password: '123456',
        cell_phone_number: '3001234567',
        is_active: true,
        actions: [],
      });
      expect(mockModuleActionsRepository.find).toHaveBeenCalledWith({
        select: { id: true },
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(mockNewUser.id, {
        ...mockNewUser,
        actions: mockActions,
      });
      expect(result).toEqual({ ...mockNewUser, actions: mockActions });
    });
  });
});
