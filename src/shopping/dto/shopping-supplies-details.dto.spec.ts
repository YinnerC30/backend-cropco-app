import { validate } from 'class-validator';
import { ShoppingSuppliesDetailsDto } from './shopping-supplies-details.dto';

describe('ShoppingSuppliesDetailsDto', () => {
  let dto: ShoppingSuppliesDetailsDto;

  beforeEach(() => {
    dto = new ShoppingSuppliesDetailsDto();
    dto.id = '6bccd56e-2123-4b95-b186-d4bdc416d868';
    dto.shopping = { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' };
    dto.supply = { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' };
    dto.supplier = { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' };
    dto.amount = 10;
    dto.total = 100;
  });

  it('should validate with correct data', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with optional id omitted', async () => {
    delete dto.id;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid UUID format', async () => {
    dto.id = 'invalid-uuid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer amount', async () => {
    dto.amount = 10.5;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative amount', async () => {
    dto.amount = -10;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer total', async () => {
    dto.total = 100.5;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative total', async () => {
    dto.total = -100;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with missing required fields', async () => {
    const emptyDto = new ShoppingSuppliesDetailsDto();
    const errors = await validate(emptyDto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
