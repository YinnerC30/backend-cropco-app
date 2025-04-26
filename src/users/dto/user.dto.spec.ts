import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './user.dto';
import { UserActionDto } from './user-action.dto';

describe('UserDto', () => {
  it('should validate a valid UserDto object', async () => {
    const userAction = new UserActionDto();
    userAction.id = '550e8400-e29b-41d4-a716-446655440000';

    const dto = plainToInstance(UserDto, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'securepassword',
      cell_phone_number: '1234567890',
      actions: [userAction],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail to create object because invalid id is sent', async () => {
    const userAction = new UserActionDto();
    userAction.id = '550e';

    const dto = plainToInstance(UserDto, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'securepassword',
      cell_phone_number: '1234567890',
      actions: [userAction],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].children[0].children[0].constraints.isUuid).toBeDefined();
  });

  it('should fail validation if required fields are missing', async () => {
    const dto = plainToInstance(UserDto, {});

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation if email is invalid', async () => {
    const dto = plainToInstance(UserDto, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'invalid-email',
      password: 'securepassword',
      cell_phone_number: '1234567890',
      actions: [],
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('should fail validation if cell_phone_number exceeds max length', async () => {
    const dto = plainToInstance(UserDto, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'securepassword',
      cell_phone_number: '123456789012345',
      actions: [],
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'cell_phone_number')).toBe(
      true,
    );
  });

  it('should fail validation if actions is not an array', async () => {
    const dto = plainToInstance(UserDto, {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      password: 'securepassword',
      cell_phone_number: '1234567890',
      actions: 'not-an-array',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'actions')).toBe(true);
  });
});
