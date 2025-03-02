import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isColombianPhone', async: false })
export class IsColombianPhoneConstraint
  implements ValidatorConstraintInterface
{
  validate(phone: string, args: ValidationArguments) {
    // Expresión regular para validar números de celular colombianos
    const colombianPhoneRegex = /^3\d{9}$/;
    return colombianPhoneRegex.test(phone);
  }

  defaultMessage(args: ValidationArguments) {
    return `The phone number (${args.value}) is not a valid Colombian cell phone number. Make sure it has 10 digits`;
  }
}

import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsColombianPhone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsColombianPhoneConstraint,
    });
  };
}
