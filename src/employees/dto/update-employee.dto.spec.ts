import { validate } from 'class-validator';
import { UpdateEmployeeDto } from './update-employee.dto';

describe('UpdateEmployeeDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new UpdateEmployeeDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
