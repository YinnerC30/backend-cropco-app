import { Test, TestingModule } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Module } from '../entities/module.entity';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt-strategy';
import { User } from 'src/users/entities/user.entity';

describe('JwtStrategy', () => {
  let jwtStrategy: JwtStrategy;
  let userRepository: Repository<User>;
  let modulesRepository: Repository<Module>;
  let mockTenantConnection: any;
  let mockRequest: any;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    is_active: true,
  } as any;

  const mockModules = [
    {
      name: 'auth',
      actions: [
        {
          id: '1',
          description: 'Login',
          path_endpoint: '/auth/login',
        },
      ],
    },
  ] as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('secret-key'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useClass: jest.fn(() => ({
            findOne: jest.fn(),
          })),
        },
        {
          provide: getRepositoryToken(Module),
          useClass: jest.fn(() => ({
            find: jest.fn(),
          })),
        },
      ],
    }).compile();

    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    modulesRepository = module.get<Repository<Module>>(
      getRepositoryToken(Module),
    );

    mockTenantConnection = {
      getRepository: (entity: any) => {
        if (entity === User) return userRepository;
        if (entity === Module) return modulesRepository;
        return null;
      },
    };
    mockRequest = { tenantConnection: mockTenantConnection };
  });

  describe('validate', () => {
    it('should return user with modules if token is valid', async () => {
      const payload = { id: '1' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(modulesRepository, 'find').mockResolvedValue(mockModules);

      const result = await jwtStrategy.validate(mockRequest, payload);

      expect(result).toEqual({ ...mockUser, modules: mockModules });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(modulesRepository.find).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const payload = { id: 'nonexistent-id' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'nonexistent-id' },
      });
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const payload = { id: '1' };
      const inactiveUser = { ...mockUser, is_active: false };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(inactiveUser);

      await expect(jwtStrategy.validate(mockRequest, payload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return user even if no modules are found', async () => {
      const payload = { id: '1' };
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(modulesRepository, 'find').mockResolvedValue([]);

      const result = await jwtStrategy.validate(mockRequest, payload);

      expect(result).toEqual({ ...mockUser, modules: [] });
    });
  });
});
