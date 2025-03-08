import { FormatMoneyValue } from './money-formatter';

describe('FormatMoneyValue', () => {
  it('should format the value as COP currency with no decimal places', () => {
    const value = 123456;
    const formattedValue = FormatMoneyValue(value);
    expect(formattedValue).toBe('$ 123.456');
  });

  it('should format zero value correctly', () => {
    const value = 0;
    const formattedValue = FormatMoneyValue(value);
    expect(formattedValue).toBe('$ 0');
  });

  it('should format negative values correctly', () => {
    const value = -123456;
    const formattedValue = FormatMoneyValue(value);
    expect(formattedValue).toBe('-$ 123.456');
  });

  it('should format large values correctly', () => {
    const value = 1234567890;
    const formattedValue = FormatMoneyValue(value);
    expect(formattedValue).toBe('$ 1.234.567.890');
  });

  it('should format values with decimal places correctly', () => {
    const value = 123456.78;
    const formattedValue = FormatMoneyValue(value);
    expect(formattedValue).toBe('$ 123.457');
  });
});
