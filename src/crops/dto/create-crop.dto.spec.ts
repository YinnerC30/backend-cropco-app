import { validate } from 'class-validator';
import { CreateCropDto } from './create-crop.dto';

describe('CreateCropDto', () => {
  let dto: CreateCropDto;

  beforeEach(() => {
    dto = new CreateCropDto();
  });

  it('should validate a valid DTO', async () => {
    dto.name = 'Maíz';
    dto.description = 'Este es un cultivo de maíz.';
    dto.units = 10;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = '2023-07-01';
    dto.date_of_termination = '2023-10-01';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if name is too short', async () => {
    dto.name = 'Ma';
    dto.units = 10;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = '2023-07-01';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail if units are less than 1', async () => {
    dto.name = 'Maíz';
    dto.units = 0;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = '2023-07-01';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('units');
  });

  it('should fail if location is too short', async () => {
    dto.name = 'Maíz';
    dto.units = 10;
    dto.location = 'A';
    dto.date_of_creation = '2023-07-01';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('location');
  });

  it('should fail if date_of_creation is not a valid date', async () => {
    dto.name = 'Maíz';
    dto.units = 10;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = 'invalid-date';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('date_of_creation');
  });

  it('should allow optional description and date_of_termination', async () => {
    dto.name = 'Maíz';
    dto.units = 10;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = '2023-07-01';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if description exceeds max length', async () => {
    dto.name = 'Maíz';
    dto.units = 10;
    dto.location = 'Parcela 4, Sector A';
    dto.date_of_creation = '2023-07-01';
    dto.description = 'a'.repeat(501);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('description');
  });
});
