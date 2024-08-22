import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InsufficientHarvestStockException } from 'src/harvest/exceptions/insufficient-harvest-stock';
import { InsufficientSupplyStockException } from 'src/supplies/exceptions/insufficient-supply-stock.exception';
import { UpdateValuesMissingError } from 'typeorm';

export const handleDBExceptions = (error: any, logger: Logger) => {
  console.error(error);
  if (error.code === '23503') throw new BadRequestException(error.detail);
  if (error.code === '23505') throw new BadRequestException(error.detail);
  if (error instanceof InsufficientHarvestStockException)
    throw new InsufficientHarvestStockException();

  if (error instanceof InsufficientSupplyStockException)
    throw new InsufficientSupplyStockException();
  if (error instanceof UpdateValuesMissingError)
    throw new BadRequestException('No values in the object');
  logger.error(error);
  throw new InternalServerErrorException('Unexpected error, check server logs');
};
