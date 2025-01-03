import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientHarvestStockException extends HttpException {
  constructor(currentStockValue: number, cropName: string) {
    super(
      `Insufficient harvest stock, available only ${currentStockValue} in ${cropName}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
