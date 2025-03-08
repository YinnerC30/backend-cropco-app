import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HandlerErrorService } from './handler-error.service';
import { UpdateValuesMissingError } from 'typeorm';

describe('HandlerErrorService', () => {
  let service: HandlerErrorService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HandlerErrorService],
    }).compile();

    service = module.get<HandlerErrorService>(HandlerErrorService);
    logger = new Logger();
    service.setLogger(logger);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw an error if logger is not set', () => {
    const errorService = new HandlerErrorService();
    expect(() => errorService.handle(new Error('Test error'))).toThrow(
      'Logger not set in HandlerErrorService',
    );
  });

  it('should log the error', () => {
    const loggerSpy = jest.spyOn(logger, 'error');
    const error = new Error('Test error');
    expect(() => service.handle(error)).toThrow(InternalServerErrorException);
    expect(loggerSpy).toHaveBeenCalledWith(error);
  });

  it('should throw BadRequestException for foreign key constraint violation', () => {
    const error = { code: '23503', detail: 'Foreign key violation' };
    expect(() => service.handle(error)).toThrow(BadRequestException);
    expect(() => service.handle(error)).toThrow(
      'Foreign key constraint violation, Foreign key violation',
    );
  });

  it('should throw BadRequestException for unique constraint violation', () => {
    const error = { code: '23505', detail: 'Unique constraint violation' };
    expect(() => service.handle(error)).toThrow(BadRequestException);
    expect(() => service.handle(error)).toThrow(
      'Unique constraint violation, Unique constraint violation',
    );
  });

  it('should rethrow HttpException', () => {
    const httpException = new BadRequestException('Http error');
    expect(() => service.handle(httpException)).toThrow(httpException);
  });

  it('should throw BadRequestException for UpdateValuesMissingError', () => {
    const error = new UpdateValuesMissingError();
    expect(() => service.handle(error)).toThrow(BadRequestException);
    expect(() => service.handle(error)).toThrow('No values in the object');
  });

  it('should throw InternalServerErrorException for unknown errors', () => {
    const error = new Error('Unknown error');
    expect(() => service.handle(error)).toThrow(InternalServerErrorException);
    expect(() => service.handle(error)).toThrow('An unexpected error occurred');
  });
});
