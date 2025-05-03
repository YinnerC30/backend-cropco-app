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
  private logger: Logger; // Logger como propiedad

  setLogger(logger: Logger) {
    this.logger = logger; // Método para establecer el Logger
  }

  handle(error: any): void {
    if (!this.logger) {
      throw new Error('Logger not set in HandlerErrorService');
    }
    this.logger.error(error);

    // console.log(error);
    if (error.code === '23503') {
      throw new BadRequestException(
        `Foreign key constraint violation, ${error.detail}`,
      );
    }
    if (error.code === '23505') {
      throw new BadRequestException(
        `Unique constraint violation, ${error.detail}`,
      );
    }

    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof UpdateValuesMissingError)
      throw new BadRequestException('No values in the object');

    throw new InternalServerErrorException('An unexpected error occurred');
  }
}
