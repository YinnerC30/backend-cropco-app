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
    const colombianPhoneRegex = /^\d{10}$/;
    return colombianPhoneRegex.test(phone);
  }

  defaultMessage(args: ValidationArguments) {
    return `El número de teléfono (${args.value}) no es un número de celular válido de Colombia. Asegúrate de que tenga 10 dígitos`;
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
