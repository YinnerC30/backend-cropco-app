import { FormatNumber } from './number-formatter';

describe('FormatNumber', () => {
  it('should format number with commas as thousand separators', () => {
    const result = FormatNumber(1234567);
    expect(result).toBe('1.234.567');
  });

  it('should format number with decimal points', () => {
    const result = FormatNumber(1234.56);
    expect(result).toBe('1.234,56');
  });

  it('should format small numbers correctly', () => {
    const result = FormatNumber(12);
    expect(result).toBe('12');
  });

  it('should format large numbers correctly', () => {
    const result = FormatNumber(9876543210);
    expect(result).toBe('9.876.543.210');
  });

  it('should format negative numbers correctly', () => {
    const result = FormatNumber(-1234.56);
    expect(result).toBe('-1.234,56');
  });
});
