import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UpdateValuesMissingError } from 'typeorm';

@Injectable()
export class HandlerErrorService {
  handle(error: any, logger: Logger): void {
    logger.error(error);

    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof UpdateValuesMissingError) {
      throw new BadRequestException('No values in the object');
    }

    switch (error.code) {
      case '23503':
        throw new BadRequestException(
          `Foreign key constraint violation, ${error.detail}`,
        );
      case '23505':
        throw new BadRequestException(
          `Unique constraint violation, ${error.detail}`,
        );

      default:
        break;
    }

    console.error(error);
    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
