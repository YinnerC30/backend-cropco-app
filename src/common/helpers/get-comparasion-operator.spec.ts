import { TypeFilterDate } from '../enums/TypeFilterDate';
import { getComparisonOperator } from './get-comparasion-operator';

describe('getComparisonOperator', () => {
  it('should return > when operator is AFTER', () => {
    const result = getComparisonOperator(TypeFilterDate.AFTER);
    expect(result).toBe('>');
  });

  it('should return = when operator is EQUAL', () => {
    const result = getComparisonOperator(TypeFilterDate.EQUAL);
    expect(result).toBe('=');
  });

  it('should return < when operator is BEFORE', () => {
    const result = getComparisonOperator(TypeFilterDate.BEFORE);
    expect(result).toBe('<');
  });

  it('should return < for any other operator value', () => {
    const result = getComparisonOperator('invalid_operator');
    expect(result).toBe('<');
  });
});
