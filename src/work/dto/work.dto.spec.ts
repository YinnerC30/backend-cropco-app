import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { WorkDto } from './work.dto';

describe('CreateWorkDto', () => {
  let dto: WorkDto;

  beforeEach(() => {
    dto = plainToInstance(WorkDto, {
      date: '2023-01-01',
      description: 'Test work'.repeat(10),
      value_pay: 100,
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      details: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
          value_pay: 100,
        },
      ],
    });
  });

  it('should validate a correct dto', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    dto.date = 'invalid-date';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty description', async () => {
    dto.description = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with description longer than 500 chars', async () => {
    dto.description = 'a'.repeat(501);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative value_pay', async () => {
    dto.value_pay = -1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer value_pay', async () => {
    dto.value_pay = 1.5;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid crop uuid', async () => {
    dto.crop.id = 'invalid-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty details array', async () => {
    dto.details = [];
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid employee uuid in details', async () => {
    dto.details[0].employee.id = 'invalid-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid work details id', async () => {
    dto.details[0].id = 'invalid-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative value_pay in details', async () => {
    dto.details[0].value_pay = -1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
