import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShoppingSuppliesDto } from './create-shopping-supplies.dto';

describe('CreateShoppingSuppliesDto', () => {
  const dtoTemplate: CreateShoppingSuppliesDto = {
    date: '2023-07-20',
    total: 100,
    details: [
      {
        id: '6bccd56e-2123-4b95-b186-d4bdc416d868',
        shopping: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        supply: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        supplier: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        amount: 10_000,
        total: 100,
      },
    ],
  };

  it('should validate with correct data', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.date = 'invalid-date';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid total', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.total = 112;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative total', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.total = -100;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty details array', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.details = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when details total does not match shopping total', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.total = 200;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer total', async () => {
    const dto = plainToClass(CreateShoppingSuppliesDto, dtoTemplate);
    dto.total = 100.5;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
