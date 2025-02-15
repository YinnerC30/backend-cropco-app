import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';
import { HandlerErrorService } from './services/handler-error.service';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  providers: [HandlerErrorService],
  exports: [TypeOrmModule, HandlerErrorService],
})
export class CommonModule {}
