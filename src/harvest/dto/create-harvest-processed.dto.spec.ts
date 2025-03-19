import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateHarvestProcessedDto } from './create-harvest-processed.dto';

describe('CreateHarvestProcessedDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = plainToClass(CreateHarvestProcessedDto, {
      date: '2024-07-11',
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      harvest: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    const dto = plainToClass(CreateHarvestProcessedDto, {
      date: 'invalid-date',
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      harvest: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isDateString');
  });

  it('should fail with negative total', async () => {
    const dto = plainToClass(CreateHarvestProcessedDto, {
      date: '2024-07-11',
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      harvest: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: -100,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isPositive');
  });

  it('should fail with non-integer total', async () => {
    const dto = plainToClass(CreateHarvestProcessedDto, {
      date: '2024-07-11',
      crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
      harvest: { id: '123e4567-e89b-12d3-a456-426614174001' },
      total: 100.5,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isInt');
  });

  it('should fail when missing required fields', async () => {
    const dto = plainToClass(CreateHarvestProcessedDto, {});

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
