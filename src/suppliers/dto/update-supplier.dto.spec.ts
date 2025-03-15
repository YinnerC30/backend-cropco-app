import { validate } from 'class-validator';
import { UpdateSupplierDto } from './update-supplier.dto';

describe('UpdateSupplierDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new UpdateSupplierDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
