import { validate } from 'class-validator';
import { UserActionDto } from './user-action.dto';

describe('UserActionDto', () => {
  it('should validate when id is a valid UUID', async () => {
    const dto = new UserActionDto();
    dto.id = '550e8400-e29b-41d4-a716-446655440000'; // valid UUID

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate when id is not provided', async () => {
    const dto = new UserActionDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when id is not a valid UUID', async () => {
    const dto = new UserActionDto();
    dto.id = 'invalid-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isUuid).toBeDefined();
  });
});
