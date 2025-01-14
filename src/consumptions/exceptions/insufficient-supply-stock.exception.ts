import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientSupplyStockException extends HttpException {
  constructor(currentStockValue: number, supplyName: string) {
    super(
      `Insufficient supply stock ${currentStockValue} in ${supplyName}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
