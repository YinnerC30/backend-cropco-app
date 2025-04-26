import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { HarvestDetailsDto } from './harvest-details.dto';

describe('HarvestDetailsDto', () => {
  it('should validate a complete valid dto', async () => {
    const dto = plainToClass(HarvestDetailsDto, {
      id: '123e4567-e89b-12d3-a456-426614174000',
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      harvest: { id: '123e4567-e89b-12d3-a456-426614174002' },
      total: 100,
      value_pay: 500,
      // payment_is_pending: true,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate with optional fields missing', async () => {
    const dto = plainToClass(HarvestDetailsDto, {
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100,
      value_pay: 500,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid UUID', async () => {
    const dto = plainToClass(HarvestDetailsDto, {
      id: 'invalid-uuid',
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100,
      value_pay: 500,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative numbers', async () => {
    const dto = plainToClass(HarvestDetailsDto, {
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: -100,
      value_pay: -500,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with non-integer numbers', async () => {
    const dto = plainToClass(HarvestDetailsDto, {
      employee: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100.5,
      value_pay: 500.5,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
