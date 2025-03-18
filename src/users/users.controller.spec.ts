import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { QueryParamsDto } from 'src/common/dto/query-params.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            toggleStatusUser: jest.fn(),
            remove: jest.fn(),
            removeBulk: jest.fn(),
            resetPassword: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call UsersService.findAll with correct parameters', async () => {
      const queryParams: QueryParamsDto = { offset: 1, limit: 10 };
      await controller.findAll(queryParams);
      expect(service.findAll).toHaveBeenCalledWith(queryParams);
    });
  });

  describe('create', () => {
    it('should call UsersService.create with correct parameters', async () => {
      const createUserDto: CreateUserDto = {
        first_name: 'John',
        email: 'john@example.com',
        last_name: 'Doe',
        password: '123456',
        cell_phone_number: '3145674321',
        actions: [],
      };
      await controller.create(createUserDto);
      expect(service.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('findOne', () => {
    it('should call UsersService.findOne with correct parameters', async () => {
      const id = 'uuid';
      await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(id);
    });
  });

  describe('update', () => {
    it('should call UsersService.update with correct parameters', async () => {
      const id = 'uuid';
      const updateUserDto: UpdateUserDto = { first_name: 'Updated Name' };
      await controller.update(id, updateUserDto);
      expect(service.update).toHaveBeenCalledWith(id, updateUserDto);
    });
  });

  describe('toggleStatusUser', () => {
    it('should call UsersService.toggleStatusUser with correct parameters', async () => {
      const id = 'uuid';
      await controller.toggleStatusUser(id);
      expect(service.toggleStatusUser).toHaveBeenCalledWith(id);
    });
  });

  describe('remove', () => {
    it('should call UsersService.remove with correct parameters', async () => {
      const id = 'uuid';
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });

  describe('removeBulk', () => {
    it('should call UsersService.removeBulk with correct parameters', async () => {
      const removeBulkUsersDto: RemoveBulkRecordsDto<any> = {
        recordsIds: [{ id: 'uuid1' }, { id: 'uuid2' }],
      };
      await controller.removeBulk(removeBulkUsersDto);
      expect(service.removeBulk).toHaveBeenCalledWith(removeBulkUsersDto);
    });
  });

  describe('resetPassword', () => {
    it('should call UsersService.resetPassword with correct parameters', async () => {
      const id = 'uuid';
      await controller.resetPassword(id);
      expect(service.resetPassword).toHaveBeenCalledWith(id);
    });
  });

  describe('changePassword', () => {
    it('should call UsersService.changePassword with correct parameters', async () => {
      const id = 'uuid';
      const changePasswordDto: ChangePasswordDto = {
        old_password: 'old',
        new_password: 'new',
      };
      await controller.changePassword(id, changePasswordDto);
      expect(service.changePassword).toHaveBeenCalledWith(
        id,
        changePasswordDto,
      );
    });
  });
});
