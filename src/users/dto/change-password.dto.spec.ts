import { validate } from 'class-validator';
import { ChangePasswordDto } from './change-password.dto';

describe('ChangePasswordDto', () => {
  let dto: ChangePasswordDto;

  beforeEach(() => {
    dto = new ChangePasswordDto();
  });

  it('should validate successfully with valid old_password and new_password', async () => {
    dto.old_password = 'oldPass123';
    dto.new_password = 'newPass123';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if old_password is not a string', async () => {
    (dto as any).old_password = 12345;
    dto.new_password = 'newPass123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isString).toBeDefined();
  });

  it('should fail validation if new_password is not a string', async () => {
    dto.old_password = 'oldPass123';
    (dto as any).new_password = 12345;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isString).toBeDefined();
  });

  it('should fail validation if old_password is shorter than 6 characters', async () => {
    dto.old_password = '123';
    dto.new_password = 'newPass123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.minLength).toBeDefined();
  });

  it('should fail validation if new_password is shorter than 6 characters', async () => {
    dto.old_password = 'oldPass123';
    dto.new_password = '123';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.minLength).toBeDefined();
  });
});
