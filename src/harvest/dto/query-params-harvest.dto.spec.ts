import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { QueryParamsHarvest } from './query-params-harvest.dto';

describe('QueryParamsHarvest', () => {
  it('should validate a valid dto', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      crop: 'corn',
      filter_by_date: 'true',
      type_filter_date: TypeFilterDate.EQUAL,
      date: '2023-01-01',
      filter_by_total: 'true',
      type_filter_total: TypeFilterNumber.EQUAL,
      total: 100,
      filter_by_value_pay: 'true',
      type_filter_value_pay: TypeFilterNumber.EQUAL,
      value_pay: 500,
      employees: [
        'f7314366-5f63-4f2b-9639-744eb652c26b',
        '8b73400f-be8e-454d-902a-4b37c9bd23d4',
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate optional fields', async () => {
    const dto = plainToClass(QueryParamsHarvest, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      date: 'invalid-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid boolean string', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      filter_by_date: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid enum value', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      type_filter_date: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should transform string to number for total', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      total: '100',
    });
    expect(typeof dto.total).toBe('number');
  });

  it('should transform comma-separated string to UUID array', async () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const dto = plainToClass(QueryParamsHarvest, {
      employees: `${uuid},${uuid}`,
    });
    expect(dto.employees).toEqual([uuid, uuid]);
  });

  it('should handle empty string for employees', async () => {
    const dto = plainToClass(QueryParamsHarvest, {
      employees: '',
    });
    expect(dto.employees).toBeUndefined();
  });
});
