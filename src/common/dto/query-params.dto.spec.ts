import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryParamsDto } from './query-params.dto';

describe('QueryParamsDto', () => {
  it('should validate limit as a positive integer greater than or equal to 10', async () => {
    const dto = plainToClass(QueryParamsDto, { limit: 5 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.min).toBeDefined();
  });

  it('should validate offset as a non-negative integer', async () => {
    const dto = plainToClass(QueryParamsDto, { offset: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.min).toBeDefined();
  });

  it('should validate all_records as a boolean', async () => {
    const dto = plainToClass(QueryParamsDto, { all_records: 'true' });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate query as a string', async () => {
    const dto = plainToClass(QueryParamsDto, { query: 123 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isString).toBeDefined();
  });

  it('should pass validation with valid data', async () => {
    const dto = plainToClass(QueryParamsDto, {
      limit: 10,
      offset: 0,
      all_records: true,
      query: 'keyword',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should use default values when properties are not provided', async () => {
    const dto = plainToClass(QueryParamsDto, {});
    expect(dto.limit).toBeUndefined();
    expect(dto.offset).toBeUndefined();
    expect(dto.all_records).toBeUndefined();
    expect(dto.query).toBeUndefined();
  });
});
