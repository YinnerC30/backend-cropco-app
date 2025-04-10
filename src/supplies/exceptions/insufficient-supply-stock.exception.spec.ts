import { InsufficientSupplyStockException } from './insufficient-supply-stock.exception';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('InsufficientSupplyStockException', () => {
  it('should create an exception with the correct error message and status', () => {
    const currentStock = 5;
    const supplyName = 'Test Supply';
    const exception = new InsufficientSupplyStockException(
      currentStock,
      supplyName,
    );

    expect(exception.message).toBe(
      `Insufficient supply stock ${currentStock} in ${supplyName}`,
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should extend HttpException', () => {
    const exception = new InsufficientSupplyStockException(0, 'Test');
    expect(exception).toBeInstanceOf(HttpException);
  });

  it('should handle zero stock value', () => {
    const exception = new InsufficientSupplyStockException(0, 'Empty Supply');
    expect(exception.message).toBe(
      'Insufficient supply stock 0 in Empty Supply',
    );
  });

  it('should handle negative stock value', () => {
    const exception = new InsufficientSupplyStockException(
      -1,
      'Negative Supply',
    );
    expect(exception.message).toBe(
      'Insufficient supply stock -1 in Negative Supply',
    );
  });
});
