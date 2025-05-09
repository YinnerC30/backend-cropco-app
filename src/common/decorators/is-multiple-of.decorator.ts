import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsMultipleOfConstraint implements ValidatorConstraintInterface {
  validate(value: number, args: ValidationArguments) {
    const multiplier = args.constraints[0];
    return Number.isInteger(value) && value % multiplier === 0;
  }

  defaultMessage(args: ValidationArguments) {
    const multiplier = args.constraints[0];
    return `The value must be a multiple of ${multiplier}`;
  }
}

export function IsMultipleOf(
  multiplier: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isMultipleOf',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [multiplier],
      options: validationOptions,
      validator: IsMultipleOfConstraint,
    });
  };
}
