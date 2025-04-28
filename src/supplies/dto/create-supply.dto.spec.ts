import { validate } from 'class-validator';
import { CreateSupplyDto } from './create-supply.dto';

describe('CreateSupplyDto', () => {
  let dto: CreateSupplyDto;

  beforeEach(() => {
    dto = new CreateSupplyDto();
    dto.name = 'Valid Supply Name';
    dto.brand = 'Valid Brand Name';
    dto.unit_of_measure = 'GRAMOS';
    dto.observation = 'Valid observation text';
  });

  it('should validate with correct data', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  describe('name validation', () => {
    it('should fail if name is too short', async () => {
      dto.name = 'abc';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail if name is too long', async () => {
      dto.name = 'a'.repeat(101);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('brand validation', () => {
    it('should fail if brand is too short', async () => {
      dto.brand = 'sh';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail if brand is too long', async () => {
      dto.brand = 'a'.repeat(101);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('unit_of_measure validation', () => {
    it('should fail if unit_of_measure is invalid', async () => {
      dto.unit_of_measure = 'INVALID' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass with GRAMOS', async () => {
      dto.unit_of_measure = 'GRAMOS';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with MILILITROS', async () => {
      dto.unit_of_measure = 'MILILITROS';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('observation validation', () => {
    it('should fail if observation is too short', async () => {
      dto.observation = 'short';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail if observation is too long', async () => {
      dto.observation = 'a'.repeat(501);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
