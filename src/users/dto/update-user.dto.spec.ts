import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new UpdateUserDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
