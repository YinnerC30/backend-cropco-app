import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';
import { HandlerErrorService } from './services/handler-error.service';
import { EncryptionService } from './services/encryption.service';
import { CookiesLoggerInterceptor } from './interceptors/cookies-logger.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  providers: [HandlerErrorService, EncryptionService, CookiesLoggerInterceptor],
  exports: [TypeOrmModule, HandlerErrorService, EncryptionService, CookiesLoggerInterceptor],
})
export class CommonModule {}
