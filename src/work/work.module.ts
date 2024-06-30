import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Work } from './entities/work.entity';
import { WorkController } from './work.controller';
import { WorkService } from './work.service';
import { WorkDetails } from './entities/work-details.entity';

@Module({
  controllers: [WorkController],
  providers: [WorkService],
  imports: [TypeOrmModule.forFeature([Work, WorkDetails])],
  exports: [WorkService, TypeOrmModule],
})
export class WorkModule {}
