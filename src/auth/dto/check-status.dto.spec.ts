import { validate } from 'class-validator';
import { CheckAuthStatusDto } from './check-status.dto';

describe('CheckAuthStatusDto', () => {
  it('should validate a correct JWT token', async () => {
    const dto = new CheckAuthStatusDto();
    dto.token = 'valid.jwt.token';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should not validate an incorrect JWT token', async () => {
    const dto = new CheckAuthStatusDto();
    dto.token = 'invalid-token';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should not validate an empty token', async () => {
    const dto = new CheckAuthStatusDto();
    dto.token = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should not validate a missing token', async () => {
    const dto = new CheckAuthStatusDto();

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
