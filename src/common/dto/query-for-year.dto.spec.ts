import { validate } from 'class-validator';
import { QueryForYearDto } from './query-for-year.dto';

describe('QueryForYear DTO', () => {
  it('should validate correctly when year is valid', async () => {
    // Arrange
    const dto = new QueryForYearDto();
    dto.year = new Date().getFullYear() - 1; // Valor válido según el DTO

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0); // No debería haber errores
  });

  // it('should fail validation when year is below the minimum value', async () => {
  //   // Arrange
  //   const dto = new QueryForYearDto();
  //   dto.year = new Date().getFullYear() - 2; // Valor inválido (menor que 2024)

  //   // Act
  //   const errors = await validate(dto);

  //   // Assert
  //   expect(errors.length).toBeGreaterThan(0); // Debería haber al menos un error
  //   expect(errors[0].constraints).toHaveProperty('min'); // El error debe ser por la regla @Min
  // });

  // it('should fail validation when year is not a number', async () => {
  //   // Arrange
  //   const dto = new QueryForYearDto();
  //   dto.year = 'not-a-number' as any; // Valor inválido (no es un número)

  //   // Act
  //   const errors = await validate(dto);

  //   // Assert
  //   expect(errors.length).toBeGreaterThan(0); // Debería haber al menos un error
  //   expect(errors[0].constraints).toHaveProperty('isNumber'); // El error debe ser por la regla @IsNumber
  // });

  it('should pass validation when year is omitted', async () => {
    // Arrange
    const dto = new QueryForYearDto();
    // No se asigna ningún valor a `year`, lo cual es opcional

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors.length).toBe(0); // No debería haber errores
  });
});
