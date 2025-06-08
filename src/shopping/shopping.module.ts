import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { ShoppingService } from './shopping.service';
import { ShoppingController } from './shopping.controller';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { PrinterModule } from 'src/printer/printer.module';
import { UnitConversionModule } from 'src/common/unit-conversion/unit-conversion.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuppliesShopping, SuppliesShoppingDetails]),
    SuppliesModule,
    SuppliersModule,
    PrinterModule,
    UnitConversionModule,
    CommonModule,
  ],
  controllers: [ShoppingController],
  providers: [ShoppingService],
  exports: [ShoppingService],
})
export class ShoppingModule {}
