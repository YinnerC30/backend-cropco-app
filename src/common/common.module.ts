import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';
import { TypeOrmErrorHandlerService } from './services/typeorm-error-handler.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  providers: [TypeOrmErrorHandlerService],
  exports: [TypeOrmModule, TypeOrmErrorHandlerService],
})
export class CommonModule {}
