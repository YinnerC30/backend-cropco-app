import { validate } from 'class-validator';
import { MatchAmount } from './match-amount.decorator';
import { IsNumber, IsPositive, IsString, IsIn, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { MassUnitDto } from '../utils/UnitTypesDto';

// Mock de HarvestDetailsDto para las pruebas
class MockHarvestDetailsDto {
  @IsString()
  @IsIn(MassUnitDto)
  unit_of_measure: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @IsPositive()
  value_pay: number;

  constructor(unit_of_measure: string, amount: number, value_pay: number) {
    this.unit_of_measure = unit_of_measure;
    this.amount = amount;
    this.value_pay = value_pay;
  }
}

// Mock de HarvestDto para las pruebas
class MockHarvestDto {
  @IsNumber()
  @IsPositive()
  @MatchAmount({
    nameArrayToCalculate: 'details',
    targetUnit: 'GRAMOS'
  })
  amount: number;

  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MockHarvestDetailsDto)
  details: MockHarvestDetailsDto[];

  constructor(amount: number, details: MockHarvestDetailsDto[]) {
    this.amount = amount;
    this.details = details;
  }
}

describe('MatchAmount Decorator', () => {
  it('debería validar correctamente cuando las cantidades coinciden (kilogramos y libras)', async () => {
    // Ejemplo del usuario: 10 kg + 25 lb = 21339.8 gramos
    // 10 kg = 10 * 1000 = 10,000 gramos
    // 25 lb = 25 * 453.592 = 11,339.8 gramos
    // Total: 21,339.8 gramos
    const harvestDto = new MockHarvestDto(21339.8, [
      new MockHarvestDetailsDto('KILOGRAMOS', 10, 1000),
      new MockHarvestDetailsDto('LIBRAS', 25, 1400),
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBe(0);
  });

  it('debería validar correctamente cuando todas las cantidades están en gramos', async () => {
    const harvestDto = new MockHarvestDto(1500, [
      new MockHarvestDetailsDto('GRAMOS', 500, 100),
      new MockHarvestDetailsDto('GRAMOS', 1000, 200),
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBe(0);
  });

  it('debería fallar la validación cuando las cantidades no coinciden', async () => {
    const harvestDto = new MockHarvestDto(2000, [
      new MockHarvestDetailsDto('KILOGRAMOS', 1, 100), // 1000 gramos
      new MockHarvestDetailsDto('LIBRAS', 1, 200), // ~453.592 gramos
    ]);
    // Total esperado: ~1453.592 gramos, pero se proporciona 2000

    const errors = await validate(harvestDto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('amount');
    // expect(errors[0].constraints).toHaveProperty('matchAmount');
  });

  it('debería manejar conversiones con onzas y toneladas', async () => {
    // 1 tonelada = 1,000,000 gramos
    // 10 onzas = 10 * 28.3495 = 283.495 gramos
    // Total: 1,000,283.495 gramos
    const harvestDto = new MockHarvestDto(1000283.495, [
      new MockHarvestDetailsDto('TONELADAS', 1, 5000),
      new MockHarvestDetailsDto('ONZAS', 10, 100),
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBe(0);
  });

  it('debería fallar cuando el array de detalles está vacío', async () => {
    const harvestDto = new MockHarvestDto(1000, []);

    const errors = await validate(harvestDto);
    expect(errors.length).toBeGreaterThan(0);
    
    // Puede fallar por ArrayNotEmpty o por MatchAmount
    const hasAmountError = errors.some(error => error.property === 'amount');
    const hasDetailsError = errors.some(error => error.property === 'details');
    expect(hasAmountError || hasDetailsError).toBeTruthy();
  });

  it('debería fallar cuando hay unidades de medida inválidas en los detalles', async () => {
    const harvestDto = new MockHarvestDto(1000, [
      new MockHarvestDetailsDto('INVALID_UNIT', 10, 100) as any,
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('debería manejar la tolerancia decimal correctamente', async () => {
    // Prueba con una diferencia muy pequeña (menos de 0.1)
    const harvestDto = new MockHarvestDto(1000.05, [
      new MockHarvestDetailsDto('GRAMOS', 1000, 100),
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBe(0); // Debería pasar por la tolerancia
  });

  it('debería fallar cuando la diferencia excede la tolerancia', async () => {
    // Prueba con una diferencia mayor a la tolerancia (más de 0.1)
    const harvestDto = new MockHarvestDto(1000.2, [
      new MockHarvestDetailsDto('GRAMOS', 1000, 100),
    ]);

    const errors = await validate(harvestDto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('amount');
  });
}); 