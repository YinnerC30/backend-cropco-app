import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class TypeOrmErrorHandlerService {
  handle(error: any): void {
    if (error.code === '23503') {
      throw new BadRequestException('Foreign key constraint violation');
    }
    if (error.code === '23505') {
      throw new BadRequestException('Unique constraint violation');
    }
    // Add more specific error codes here as needed
    // Log the error and throw a generic server error
    console.error('Unexpected database error:', error);
    throw new InternalServerErrorException(
      'An unexpected database error occurred',
    );
  }
}
