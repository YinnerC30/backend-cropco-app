import { validate } from 'class-validator';
import { IsMultipleOf } from './is-multiple-of.decorator';

describe('IsMultipleOf', () => {
  class TestClass {
    @IsMultipleOf(5)
    value: number;
  }

  it('should pass validation when value is multiple of specified number', async () => {
    const test = new TestClass();
    test.value = 15;
    const errors = await validate(test);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when value is not multiple of specified number', async () => {
    const test = new TestClass();
    test.value = 12;
    const errors = await validate(test);
    expect(errors.length).toBe(1);

    expect(errors[0].constraints).toHaveProperty(
      'IsMultipleOfConstraint',
      'The value must be a multiple of 5',
    );
  });

  it('should fail validation when value is not an integer', async () => {
    const test = new TestClass();
    test.value = 15.5;
    const errors = await validate(test);
    expect(errors.length).toBe(1);
  });

  it('should fail validation when value is negative but not multiple', async () => {
    const test = new TestClass();
    test.value = -12;
    const errors = await validate(test);
    expect(errors.length).toBe(1);
  });

  it('should pass validation when value is negative multiple', async () => {
    const test = new TestClass();
    test.value = -15;
    const errors = await validate(test);
    expect(errors.length).toBe(0);
  });
});
