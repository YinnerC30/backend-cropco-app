import { InsufficientHarvestStockException } from './insufficient-harvest-stock';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('InsufficientHarvestStockException', () => {
  it('should create exception with correct message and status', () => {
    const currentStock = 10;
    const cropName = 'Corn';
    const exception = new InsufficientHarvestStockException(
      currentStock,
      cropName,
    );

    expect(exception.message).toBe(
      `Insufficient harvest stock, available only ${currentStock} in ${cropName}`,
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('should extend HttpException', () => {
    const exception = new InsufficientHarvestStockException(5, 'Wheat');
    expect(exception).toBeInstanceOf(HttpException);
  });

  it('should handle zero stock value', () => {
    const exception = new InsufficientHarvestStockException(0, 'Rice');
    expect(exception.message).toBe(
      'Insufficient harvest stock, available only 0 in Rice',
    );
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });
});
