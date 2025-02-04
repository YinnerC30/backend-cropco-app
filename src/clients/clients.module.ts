import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { PrinterModule } from '../printer/printer.module';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';
import { Sale } from 'src/sales/entities/sale.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, SaleDetails, Sale]),
    PrinterModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService, TypeOrmModule],
})
export class ClientsModule {}
