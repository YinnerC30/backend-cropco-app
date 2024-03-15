import { Module } from '@nestjs/common';

import { PersonalInformation } from './entities/personal-information.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([PersonalInformation])],
  exports: [TypeOrmModule],
})
export class CommonModule {}
