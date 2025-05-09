import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { QueryParamsWork } from './query-params-work.dto';

describe('QueryParamsWork', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      crop: 'corn',
      filter_by_date: 'true',
      type_filter_date: TypeFilterDate.EQUAL,
      date: '2023-01-01',
      filter_by_total: 'false',
      type_filter_total: TypeFilterNumber.MAX,
      value_pay: 100,
      employees: [
        'f7314366-5f63-4f2b-9639-744eb652c26b',
        '8b73400f-be8e-454d-902a-4b37c9bd23d4',
      ],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with empty optional fields', async () => {
    const dto = plainToInstance(QueryParamsWork, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid date format', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      date: 'invalid-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid boolean string', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      filter_by_date: 'invalid',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid enum value', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      type_filter_date: 'INVALID',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid value_pay value', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      value_pay: 'not-a-number',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail validation with invalid UUID in employees array', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      employees: 'invalid-uuid,123e4567-e89b-12d3-a456-426614174000',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should transform empty string employees to undefined', async () => {
    const dto = plainToInstance(QueryParamsWork, {
      employees: '',
    });
    expect(dto.employees).toBeUndefined();
  });
});
