import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WorkDetailsDto } from './create-work-details.dto';

describe('WorkDetailsDto', () => {
  let dto: WorkDetailsDto;

  beforeEach(() => {
    dto = plainToInstance(WorkDetailsDto, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      value_pay: 100,
    });
  });

  it('should validate a valid DTO', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate optional id if UUID', async () => {
    dto.id = 'invalid-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('id');
  });

  it('should require employee object', async () => {
    dto.employee = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('employee');
  });

  it('should require value_pay to be positive integer', async () => {
    dto.value_pay = -1;
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('value_pay');
  });
});
