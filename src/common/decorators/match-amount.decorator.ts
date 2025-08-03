import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  UnitConversionService,
  UnitType,
} from '../unit-conversion/unit-conversion.service';

interface MatchAmountOptions {
  nameArrayToCalculate: string; // Nombre del array (e.g., 'details')
  unitField?: string; // Campo que contiene la unidad (default: 'unit_of_measure')
  amountField?: string; // Campo que contiene la cantidad (default: 'amount')
  targetUnit?: UnitType; // Unidad objetivo (default: 'GRAMOS')
}

@ValidatorConstraint({ async: false })
export class MatchAmountConstraint implements ValidatorConstraintInterface {
  private unitConversionService = new UnitConversionService();

  validate(value: any, args: ValidationArguments): boolean {
    const options: MatchAmountOptions = args.constraints[0];
    const object = args.object as any;

    // Valores por defecto
    const unitField = options.unitField || 'unit_of_measure';
    const amountField = options.amountField || 'amount';
    const targetUnit = options.targetUnit || ('GRAMOS' as UnitType);

    // Verificar que el array existe y es válido
    if (!Array.isArray(object[options.nameArrayToCalculate])) {
      return false;
    }

    try {
      // Calcular la suma total convirtiendo cada cantidad a la unidad objetivo
      const totalAmountInTargetUnit = object[
        options.nameArrayToCalculate
      ].reduce((total: number, detail: any) => {
        if (!detail[unitField] || typeof detail[amountField] !== 'number') {
          return total;
        }

        const convertedAmount = this.unitConversionService.convert(
          detail[amountField],
          detail[unitField],
          targetUnit,
        );

        return total + convertedAmount;
      }, 0);

      // Comparar con una tolerancia de 0.1 para manejar precisión de decimales
      const tolerance = 0.1;
      const difference = Math.abs(value - totalAmountInTargetUnit);

      return difference <= tolerance;
    } catch (error) {
      // Si hay error en la conversión, la validación falla
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    const options: MatchAmountOptions = args.constraints[0];
    const targetUnit = options.targetUnit || ('GRAMOS' as UnitType);

    return `El valor de 'amount' debe coincidir con la suma de las cantidades en '${options.nameArrayToCalculate}' convertidas a ${targetUnit}.`;
  }
}

/**
 * Decorador que valida que el amount principal coincida con la suma de los amounts
 * de un array de detalles, convirtiendo las unidades de medida a una unidad objetivo.
 *
 * @param options - Configuración del decorador
 * @param validationOptions - Opciones adicionales de validación
 *
 * @example
 * ```typescript
 * export class HarvestDto {
 *   @IsNumber()
 *   @IsPositive()
 *   @MatchAmount({
 *     nameArrayToCalculate: 'details',
 *     targetUnit: 'GRAMOS'
 *   })
 *   amount: number;
 *
 *   @ValidateNested({ each: true })
 *   @Type(() => HarvestDetailsDto)
 *   details: HarvestDetailsDto[];
 * }
 * ```
 */
export function MatchAmount(
  options: MatchAmountOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: MatchAmountConstraint,
    });
  };
}
