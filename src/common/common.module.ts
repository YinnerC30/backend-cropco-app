import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';
import { HandlerErrorService } from './services/handler-error.service';
import { EncryptionService } from './services/encryption.service';
import { CookiesLoggerInterceptor } from './interceptors/cookies-logger.interceptor';
import { RateLimitGuard } from './guards/rate-limit.guard';

// Re-exportar decoradores para uso en otros módulos
export * from './decorators/rate-limit.decorator';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  providers: [HandlerErrorService, EncryptionService, CookiesLoggerInterceptor, RateLimitGuard],
  exports: [TypeOrmModule, HandlerErrorService, EncryptionService, CookiesLoggerInterceptor, RateLimitGuard],
})
export class CommonModule {}
