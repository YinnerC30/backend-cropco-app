import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UpdateValuesMissingError } from 'typeorm';

export const handleDBExceptions = (error: any, logger: Logger) => {
  console.log(error);
  if (error.code === '23503') throw new BadRequestException(error.detail);
  if (error.code === '23505') throw new BadRequestException(error.detail);
  if (error instanceof UpdateValuesMissingError)
    throw new BadRequestException('No values in the object');
  logger.error(error);
  throw new InternalServerErrorException('Unexpected error, check server logs');
};
