import { validate } from 'class-validator';
import { UpdateSuppliesShoppingDto } from './update-supplies-shopping.dto';
import { plainToClass } from 'class-transformer';

describe('UpdateSuppliesShoppingDto', () => {
  it('should be defined', () => {
    expect(new UpdateSuppliesShoppingDto()).toBeDefined();
  });

  it('should allow partial updates', async () => {
    const updateShoppingDto = plainToClass(UpdateSuppliesShoppingDto, {
      total: 200,
    });
    const errors = await validate(updateShoppingDto);
    expect(errors.length).toBe(0);
  });
});
