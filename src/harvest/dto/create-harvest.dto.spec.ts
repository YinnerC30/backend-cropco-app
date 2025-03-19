import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateHarvestDto } from './create-harvest.dto';

describe('CreateHarvestDto', () => {
  const employeeId1 = '123e4567-e89b-12d3-a456-426614174001';
  const employeeId2 = '23ac8bbf-d251-4011-9159-e2df42ca0441';

  const validDetail = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    employee: { id: employeeId1 },
    total: 100,
    value_pay: 500,
    payment_is_pending: false,
  };

  const validDto = {
    date: '2024-07-11',
    crop: { id: '123e4567-e89b-12d3-a456-426614174000' },
    total: 100,
    value_pay: 500,
    observation: 'Cosecha de alta calidad',
    details: [validDetail],
  };

  it('should fail when duplicate employee IDs exist in details', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      details: [
        {
          ...validDetail,
          employee: { id: employeeId1 },
        },
        {
          ...validDetail,
          employee: { id: employeeId1 }, // Same ID
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate when all employee IDs in details are unique', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      total: 200,
      value_pay: 1000,
      details: [
        {
          ...validDetail,
          employee: { id: employeeId1 },
        },
        {
          ...validDetail,
          employee: { id: employeeId2 }, // Different ID
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when details total does not match harvest total', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      total: 100,
      details: [
        {
          ...validDetail,
          total: 50,
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when details value_pay does not match harvest value_pay', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      value_pay: 500,
      details: [
        {
          ...validDetail,
          value_pay: 400,
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate when multiple details sum matches harvest totals', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      total: 150,
      value_pay: 750,
      details: [
        {
          ...validDetail,
          total: 100,
          value_pay: 500,
        },
        {
          ...validDetail,
          employee: { id: employeeId2 }, // Different ID
          total: 50,
          value_pay: 250,
        },
      ],
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate a correct harvest dto', async () => {
    const dto = plainToClass(CreateHarvestDto, validDto);
    const errors = await validate(dto);
    console.log(JSON.stringify(errors, null, 2));
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid date format', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      date: 'invalid-date',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with negative total', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      total: -100,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with empty details array', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      details: [],
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with invalid UUID in crop', async () => {
    const dto = plainToClass(CreateHarvestDto, {
      ...validDto,
      crop: { id: 'invalid-uuid' },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  describe('HarvestDetails validation', () => {
    it('should fail with negative total in details', async () => {
      const dto = plainToClass(CreateHarvestDto, {
        ...validDto,
        details: [
          {
            ...validDetail,
            total: -50,
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with invalid employee UUID in details', async () => {
      const dto = plainToClass(CreateHarvestDto, {
        ...validDto,
        details: [
          {
            ...validDetail,
            employee: { id: 'invalid-uuid' },
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with non-integer value_pay in details', async () => {
      const dto = plainToClass(CreateHarvestDto, {
        ...validDto,
        details: [
          {
            ...validDetail,
            value_pay: 10.5,
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate with optional payment_is_pending', async () => {
      const dto = plainToClass(CreateHarvestDto, {
        ...validDto,
        details: [
          {
            ...validDetail,
            payment_is_pending: undefined,
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with non-boolean payment_is_pending', async () => {
      const dto = plainToClass(CreateHarvestDto, {
        ...validDto,
        details: [
          {
            ...validDetail,
            payment_is_pending: 'true',
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
