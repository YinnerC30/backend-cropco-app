// validate-categories.decorator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class HasAtLeastOneCategoryConstraint
  implements ValidatorConstraintInterface
{
  validate(value: any[], args: ValidationArguments) {
    const obj = value as { harvests?: any[]; works?: any[] };

    if (!obj) {
      return false;
    }
    const hasHarvests = Array.isArray(obj.harvests) && obj.harvests.length > 0;
    const hasWorks = Array.isArray(obj.works) && obj.works.length > 0;

    return hasHarvests || hasWorks;
  }

  defaultMessage(args: ValidationArguments) {
    return `At least one of the 'harvests' or 'works' fields must contain values in 'categories'.`;
  }
}

export function HasAtLeastOneCategory(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'hasAtLeastOneCategory',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: HasAtLeastOneCategoryConstraint,
    });
  };
}
