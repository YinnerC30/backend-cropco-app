import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';
import { HandlerErrorService } from './services/handler-error.service';
import { CookiesLoggerInterceptor } from './interceptors/cookies-logger.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  providers: [HandlerErrorService, CookiesLoggerInterceptor],
  exports: [TypeOrmModule, HandlerErrorService, CookiesLoggerInterceptor],
})
export class CommonModule {}
