import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalInformation } from './entities/personal-information.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  exports: [TypeOrmModule],
})
export class CommonModule {}
