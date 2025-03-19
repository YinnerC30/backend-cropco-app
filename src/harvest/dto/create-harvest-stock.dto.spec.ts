import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { HarvestStockDto } from './create-harvest-stock.dto';

describe('HarvestStockDto', () => {
  let dto: HarvestStockDto;

  beforeEach(() => {
    dto = plainToClass(HarvestStockDto, {
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      total: 100,
    });
  });

  it('should be valid with correct data', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid crop uuid', async () => {
    dto = plainToClass(HarvestStockDto, {
      crop: { id: 'invalid-uuid' },
      total: 100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer total', async () => {
    dto = plainToClass(HarvestStockDto, {
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      total: 10.5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative total', async () => {
    dto = plainToClass(HarvestStockDto, {
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      total: -100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when crop is missing', async () => {
    dto = plainToClass(HarvestStockDto, {
      total: 100,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when total is missing', async () => {
    dto = plainToClass(HarvestStockDto, {
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
