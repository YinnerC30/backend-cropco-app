import { InsufficientSupplyStockException } from './insufficient-supply-stock.exception';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('InsufficientSupplyStockException', () => {
  it('should create an exception with the correct error message and status', () => {
    const currentStock = 5;
    const supplyName = 'Test Supply';
    const supplyUnitOfMeasure = 'GRAMOS';
    const exception = new InsufficientSupplyStockException(
      currentStock,
      supplyName,
      supplyUnitOfMeasure,
    );

    expect(exception.message).toBe(
      `Insufficient supply stock, only ${currentStock} ${supplyUnitOfMeasure} are in ${supplyName}`,
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should extend HttpException', () => {
    const exception = new InsufficientSupplyStockException(0, 'Test', 'GRAMOS');
    expect(exception).toBeInstanceOf(HttpException);
  });

  it('should handle zero stock value', () => {
    const exception = new InsufficientSupplyStockException(
      0,
      'Empty Supply',
      'MILILITROS',
    );
    expect(exception.message).toBe(
      'Insufficient supply stock, only 0 MILILITROS are in Empty Supply',
    );
  });

  it('should handle negative stock value', () => {
    const exception = new InsufficientSupplyStockException(
      -1,
      'Negative Supply',
      'GRAMOS',
    );
    expect(exception.message).toBe(
      'Insufficient supply stock, only -1 GRAMOS are in Negative Supply',
    );
  });
});
