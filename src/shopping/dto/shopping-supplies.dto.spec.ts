import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ShoppingSuppliesDto } from './shopping-supplies.dto';


describe('CreateShoppingSuppliesDto', () => {
  const dtoTemplate: ShoppingSuppliesDto = {
    date: '2023-07-20',
    value_pay: 100,
    details: [
      {
        id: '6bccd56e-2123-4b95-b186-d4bdc416d868',
        // shopping: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        supply: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        supplier: { id: '6bccd56e-2123-4b95-b186-d4bdc416d868' },
        unit_of_measure: 'GRAMOS',
        amount: 10_000,
        value_pay: 100,
      },
    ],
  };

  it('should validate with correct data', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    const errors = await validate(dto);
    console.log("🚀 ~ it ~ errors:", JSON.stringify(errors,null,2))

    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.date = 'invalid-date';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid value_pay', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.value_pay = 112;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative value_pay', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.value_pay = -100;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty details array', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.details = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when details value_pay does not match shopping value_pay', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.value_pay = 200;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer value_pay', async () => {
    const dto = plainToClass(ShoppingSuppliesDto, dtoTemplate);
    dto.value_pay = 100.5;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
