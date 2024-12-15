import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientHarvestStockException extends HttpException {
  constructor(currentStockValue: number, cropName: string) {
    console.log(currentStockValue);
    super(`Insufficient harvest stock, available only ${currentStockValue} in ${cropName}`, HttpStatus.BAD_REQUEST);
  }
}
