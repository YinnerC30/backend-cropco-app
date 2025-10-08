import { validate } from 'class-validator';
import { CreateSupplierDto } from './create-supplier.dto';

describe('CreateSupplierDto', () => {
  let dto: CreateSupplierDto;

  beforeEach(() => {
    dto = new CreateSupplierDto();
    dto.first_name = 'John';
    dto.last_name = 'Doe';
    dto.company_name = 'Acme Inc.';
    dto.email = 'john.doe@example.com';
    dto.cell_phone_number = '1234567890';
    dto.address = '123 Main St, Anytown, AN 12345';
  });

  it('should validate a valid DTO', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if first_name is missing', async () => {
    dto.first_name = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('first_name');
  });

  it('should fail if last_name exceeds max length', async () => {
    dto.last_name = 'a'.repeat(101);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('last_name');
  });

  it('should allow company_name to be optional', async () => {
    dto.company_name = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if email is invalid', async () => {
    dto.email = 'invalid-email';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail if cell_phone_number is not numeric', async () => {
    dto.cell_phone_number = 'abc123';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('cell_phone_number');
  });

  it('should fail if cell_phone_number exceeds max length', async () => {
    dto.cell_phone_number = '123456789017878787887';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('cell_phone_number');
  });

  it('should fail if address exceeds max length', async () => {
    dto.address = 'a'.repeat(201);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('address');
  });
});
