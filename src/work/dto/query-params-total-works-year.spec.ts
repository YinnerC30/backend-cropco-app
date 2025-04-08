import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { QueryTotalWorksInYearDto } from './query-params-total-works-year';

describe('QueryTotalWorksInYearDto', () => {
  it('should pass validation with valid data', async () => {
    const dto = plainToClass(QueryTotalWorksInYearDto, {
      year: 2024,
      crop: '8b73400f-be8e-454d-902a-4b37c9bd23d4',
      employee: '8b73400f-be8e-454d-902a-4b37c9bd23d4',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with year 2023', async () => {
    const dto = plainToClass(QueryTotalWorksInYearDto, {
      year: 2023,
      crop: '8b73400f-be8e-454d-902a-4b37c9bd23d4',
      employee: '8b73400f-be8e-454d-902a-4b37c9bd23d4',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });

  it('should pass validation with optional fields omitted', async () => {
    const dto = plainToClass(QueryTotalWorksInYearDto, {
      year: 2024,
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation with invalid UUID for crop', async () => {
    const dto = plainToClass(QueryTotalWorksInYearDto, {
      year: 2024,
      crop: 'invalid-uuid',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('crop');
  });

  it('should fail validation with invalid UUID for employee', async () => {
    const dto = plainToClass(QueryTotalWorksInYearDto, {
      year: 2024,
      employee: 'invalid-uuid',
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('employee');
  });
});
