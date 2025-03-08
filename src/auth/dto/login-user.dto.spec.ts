import { validate } from 'class-validator';
import { LoginUserDto } from './login-user.dto';

describe('LoginUserDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = new LoginUserDto();
    dto.email = 'test@gmail.com';
    dto.password = '1234password';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should not validate an incorrect email', async () => {
    const dto = new LoginUserDto();
    dto.email = 'invalid-email';
    dto.password = '1234password';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });

  it('should not validate an empty password', async () => {
    const dto = new LoginUserDto();
    dto.email = 'test@gmail.com';
    dto.password = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should not validate a password longer than 100 characters', async () => {
    const dto = new LoginUserDto();
    dto.email = 'test@gmail.com';
    dto.password = 'a'.repeat(101);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });
});
