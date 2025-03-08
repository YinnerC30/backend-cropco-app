import { validate } from 'class-validator';
import { RemoveBulkRecordsDto } from './remove-bulk-records.dto';
import { plainToClass } from 'class-transformer';

describe('RemoveBulkRecordsDto', () => {
  it('should validate successfully with valid recordsIds', async () => {
    const dto = new RemoveBulkRecordsDto();
    dto.recordsIds = [{ id: '123e4567-e89b-12d3-a456-426614174000' }];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when recordsIds is not an array', async () => {
    const dto = new RemoveBulkRecordsDto();
    dto.recordsIds = 'not-an-array' as any;

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints.isArray).toBeDefined();
  });

  it('should fail validation when recordsIds is an empty array', async () => {
    const dto = new RemoveBulkRecordsDto();
    dto.recordsIds = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints.arrayNotEmpty).toBeDefined();
  });

  it('should fail validation when recordsIds contains invalid UUIDs', async () => {
    const dto = plainToClass(RemoveBulkRecordsDto, {
      recordsIds: [{ id: 'hola' }],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(1);
  });
});
