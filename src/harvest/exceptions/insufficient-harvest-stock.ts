import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientHarvestStockException extends HttpException {
  constructor() {
    super('Insufficient harvest stock', HttpStatus.BAD_REQUEST);
  }
}
