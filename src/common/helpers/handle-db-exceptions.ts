import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InsufficientHarvestStockException } from 'src/harvest/exceptions/insufficient-harvest-stock';
import { InsufficientSupplyStockException } from 'src/supplies/exceptions/insufficient-supply-stock.exception';

import { UpdateValuesMissingError } from 'typeorm';

export const handleDBExceptions = (error: any, logger: Logger) => {
  if (error.code === '23503') throw new BadRequestException(error.detail);
  if (error.code === '23505') throw new BadRequestException(error.detail);

  if (
    error instanceof BadRequestException ||
    error instanceof NotFoundException
  ) {
    throw error;
  }

  if (error instanceof InsufficientHarvestStockException) throw error;

  if (error instanceof InsufficientSupplyStockException) throw error;

  if (error instanceof UpdateValuesMissingError)
    throw new BadRequestException('No values in the object');
  logger.error(error);
  console.log(error);
  throw new InternalServerErrorException('Unexpected error, check server logs');
};
