import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface MatchTotalsOptions {
  fields: string[]; // Propiedades a calcular (e.g., ['total', 'value_pay'])
  nameArrayToCalculate: string; // Nombre del array (e.g., 'details')
}

@ValidatorConstraint({ async: false })
export class MatchTotalsConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const options: MatchTotalsOptions = args.constraints[0];
    const object = args.object as any;

    if (!Array.isArray(object[options.nameArrayToCalculate])) {
      return false;
    }

    // Validar que las propiedades especificadas en `fields` coincidan
    return options.fields.every((field) => {
      const sum = object[options.nameArrayToCalculate].reduce(
        (acc, detail) => acc + (detail[field] || 0),
        0,
      );
      return sum === object[field];
    });
  }

  defaultMessage(args: ValidationArguments): string {
    const options: MatchTotalsOptions = args.constraints[0];
    return `The sum of fields [${options.fields.join(
      ', ',
    )}] in '${options.nameArrayToCalculate}' must match the corresponding top-level values.`;
  }
}

export function MatchTotals(
  options: MatchTotalsOptions,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options],
      validator: MatchTotalsConstraint,
    });
  };
}
