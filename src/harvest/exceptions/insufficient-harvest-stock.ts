import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientHarvestStockException extends HttpException {
  constructor(currentStockValue: number, cropId: string) {
    super(
      `Insufficient harvest stock in crop with id ${cropId}, available only ${currentStockValue}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

