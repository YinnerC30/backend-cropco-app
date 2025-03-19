import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class UniqueRecordIdInArrayConstraint implements ValidatorConstraintInterface {
  validate(value: any[], args: ValidationArguments) {
    if (!Array.isArray(value)) {
      return false;
    }

    const propertyName = args.constraints[0];
    const ids = value.map((item) => item[propertyName]?.id).filter(Boolean);
    const uniqueIds = new Set(ids);

    return ids.length === uniqueIds.size;
  }

  defaultMessage(args: ValidationArguments) {
    const propertyName = args.constraints[0];
    return `The array contains duplicate ${propertyName}s. Each ${propertyName} id must be unique.`;
  }
}

export function UniqueRecordIdInArray(
  propertyName: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyKey: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyKey,
      options: validationOptions,
      constraints: [propertyName],
      validator: UniqueRecordIdInArrayConstraint,
    });
  };
}
