import { TypeFilterDate } from '../enums/TypeFilterDate';

export const getComparisonOperator = (operator: string): string => {
  return TypeFilterDate.AFTER == operator
    ? '>'
    : TypeFilterDate.EQUAL == operator
      ? '='
      : '<';
};
