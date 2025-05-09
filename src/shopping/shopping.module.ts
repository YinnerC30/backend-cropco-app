import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [ShoppingController],
  providers: [ShoppingService],
  imports: [TypeOrmModule.forFeature([
        SuppliesShopping,
        SuppliesShoppingDetails,
      ]),SuppliesModule, CommonModule],
  exports: [ShoppingService, TypeOrmModule],
})
export class ShoppingModule { }
