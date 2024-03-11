import { Module } from '@nestjs/common';
import { WorkService } from './work.service';
import { WorkController } from './work.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Work } from './entities/work.entity';

@Module({
  controllers: [WorkController],
  providers: [WorkService],
  imports: [TypeOrmModule.forFeature([Work])],
  exports: [WorkService, TypeOrmModule],
})
export class WorkModule {}
