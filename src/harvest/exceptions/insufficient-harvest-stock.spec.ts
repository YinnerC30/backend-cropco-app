import { InsufficientHarvestStockException } from './insufficient-harvest-stock';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('InsufficientHarvestStockException', () => {
  it('should create exception with correct message and status', () => {
    const currentStock = 10;
    const cropId = '123';
    const exception = new InsufficientHarvestStockException(
      currentStock,
      cropId,
    );

    expect(exception.message).toBe(
      `Insufficient harvest stock in crop with id ${cropId}, available only ${currentStock}`,
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should extend HttpException', () => {
    const exception = new InsufficientHarvestStockException(5, '123');
    expect(exception).toBeInstanceOf(HttpException);
  });

  it('should handle zero stock value', () => {
    const exception = new InsufficientHarvestStockException(0, '123');
    expect(exception.message).toBe(
      'Insufficient harvest stock in crop with id 123, available only 0',
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});
