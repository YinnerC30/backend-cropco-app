import { TypeFilterDate } from '../enums/TypeFilterDate';
import { TypeFilterNumber } from '../enums/TypeFilterNumber';

export const getComparisonOperator = (operator: string): string => {
  return TypeFilterDate.AFTER == operator || TypeFilterNumber.GREATER_THAN == operator
    ? '>'
    : TypeFilterDate.EQUAL == operator || TypeFilterNumber.EQUAL == operator
      ? '='
      : '<';
};
