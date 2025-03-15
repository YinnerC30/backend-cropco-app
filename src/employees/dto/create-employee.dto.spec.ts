import { validate } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

describe('CreateEmployeeDto', () => {
  let dto: CreateEmployeeDto;

  beforeEach(() => {
    dto = new CreateEmployeeDto();
  });

  it('should validate a valid DTO', async () => {
    dto.first_name = 'Juan';
    dto.last_name = 'Pérez';
    dto.email = 'juan.perez@example.com';
    dto.cell_phone_number = '3123456789';
    dto.address = 'Calle Falsa 123, Ciudad, País';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if first_name exceeds max length', async () => {
    dto.first_name = 'a'.repeat(101);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('should fail if last_name exceeds max length', async () => {
    dto.last_name = 'a'.repeat(101);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('should fail if email is not valid', async () => {
    dto.email = 'invalid-email';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const error = errors.find((e) => e.property === 'email');
    expect(error.constraints?.isEmail).toBeDefined();
  });

  it('should fail if cell_phone_number is not numeric', async () => {
    dto.cell_phone_number = 'invalid123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const error = errors.find((e) => e.property === 'cell_phone_number');
    expect(error.constraints?.isNumberString).toBeDefined();
  });

  it('should fail if cell_phone_number exceeds max length', async () => {
    dto.cell_phone_number = '12345678901';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });

  it('should fail if address exceeds max length', async () => {
    dto.address = 'a'.repeat(201);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.maxLength).toBeDefined();
  });
});
