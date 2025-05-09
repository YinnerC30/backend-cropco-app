import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientSupplyStockException extends HttpException {
  constructor(
    currentStockValue: number,
    supplyName: string,
    supplyUnitOfMeasure: string,
  ) {
    super(
      `Insufficient supply stock, only ${currentStockValue} ${supplyUnitOfMeasure} are in ${supplyName}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
