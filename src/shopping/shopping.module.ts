import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuppliesModule } from 'src/supplies/supplies.module';
import { SuppliesShopping, SuppliesShoppingDetails } from './entities';
import { ShoppingController } from './shopping.controller';
import { ShoppingService } from './shopping.service';

@Module({
  controllers: [ShoppingController],
  providers: [ShoppingService],
  imports: [TypeOrmModule.forFeature([
        SuppliesShopping,
        SuppliesShoppingDetails,
      ]),SuppliesModule],
  exports: [ShoppingService, TypeOrmModule],
})
export class ShoppingModule { }
