import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientSupplyStockException extends HttpException {
  constructor() {
    super('Insufficient supply stock', HttpStatus.BAD_REQUEST);
  }
}
