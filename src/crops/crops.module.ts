import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { Crop } from './entities/crop.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Crop]),CommonModule,],
  controllers: [CropsController],
  providers: [CropsService],
  exports: [CropsService, TypeOrmModule],
})
export class CropsModule {}
