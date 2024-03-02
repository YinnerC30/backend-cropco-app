import { Module } from '@nestjs/common';
import { CropsService } from './crops.service';
import { CropsController } from './crops.controller';
import { DatabaseModule } from '../database/database.module';
import { cropProviders } from './crops.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [CropsController],
  providers: [...cropProviders, CropsService],
  exports: [CropsService],
})
export class CropsModule {}
