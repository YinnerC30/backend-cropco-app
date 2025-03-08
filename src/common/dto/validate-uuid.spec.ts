import { validate } from 'class-validator';
import { ValidateUUID } from './validate-uuid';

describe('ValidateUUID', () => {
  it('should validate a correct UUID', async () => {
    const dto = new ValidateUUID();
    dto.id = '123e4567-e89b-12d3-a456-426614174000';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should not validate an incorrect UUID', async () => {
    const dto = new ValidateUUID();
    dto.id = 'invalid-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isUuid).toBeDefined();
  });

  it('should not validate an empty UUID', async () => {
    const dto = new ValidateUUID();
    dto.id = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isUuid).toBeDefined();
  });

  it('should not validate a missing UUID', async () => {
    const dto = new ValidateUUID();

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isUuid).toBeDefined();
  });
});
