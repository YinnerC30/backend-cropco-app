import { Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { DatabaseModule } from '../database/database.module';
import { supplierProviders } from './suppliers.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [SuppliersController],
  providers: [...supplierProviders, SuppliersService],
  exports: [SuppliersService],
})
export class SuppliersModule {}
