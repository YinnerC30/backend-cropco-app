import { validate } from 'class-validator';
import { MatchTotals } from './match-totals.decorator';

class TestClass {
  @MatchTotals({
    fields: ['total', 'value_pay'],
    nameArrayToCalculate: 'details',
  })
  details: any[];

  total: number;
  value_pay: number;
}

describe('MatchTotals Decorator', () => {
  let testObj: TestClass;

  beforeEach(() => {
    testObj = new TestClass();
  });

  it('should validate when sums match the top-level values', async () => {
    testObj.details = [
      { total: 10, value_pay: 5 },
      { total: 20, value_pay: 15 },
    ];
    testObj.total = 30;
    testObj.value_pay = 20;

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when sums do not match', async () => {
    testObj.details = [
      { total: 10, value_pay: 5 },
      { total: 20, value_pay: 15 },
    ];
    testObj.total = 40; // Incorrect sum
    testObj.value_pay = 20;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
  });

  it('should fail validation when details is not an array', async () => {
    testObj.details = 'not an array' as any;
    testObj.total = 30;
    testObj.value_pay = 20;

    const errors = await validate(testObj);
    expect(errors.length).toBe(1);
  });

  it('should handle missing field values in details', async () => {
    testObj.details = [
      { total: 10 }, // missing value_pay
      { total: 20, value_pay: 15 },
    ];
    testObj.total = 30;
    testObj.value_pay = 15;

    const errors = await validate(testObj);
    expect(errors.length).toBe(0);
  });

  it('should validate with custom error message', async () => {
    testObj.details = [
      { total: 10, value_pay: 5 },
      { total: 20, value_pay: 15 },
    ];
    testObj.total = 40; // Incorrect sum
    testObj.value_pay = 20;

    const errors = await validate(testObj);
    expect(errors[0].constraints).toHaveProperty('MatchTotalsConstraint');
    expect(errors[0].constraints.MatchTotalsConstraint).toBe(
      "The sum of fields [total, value_pay] in 'details' must match the corresponding top-level values.",
    );
  });
});
