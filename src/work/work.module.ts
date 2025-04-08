import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Work } from './entities/work.entity';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkDetails } from './entities/work-details.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [WorkController],
  providers: [WorkService],
  imports: [TypeOrmModule.forFeature([Work, WorkDetails]), CommonModule],
  exports: [WorkService, TypeOrmModule],
})
export class WorkModule {}
