import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from '../entities/supply.entity';
import { DeepPartial } from 'typeorm';
import { IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { SuppliesPurchase } from '../entities/supplies-purchase.entity';

export class PurchaseSuppliesDetailsDto {
  @IsOptional()
  @IsUUID()
  purchase: DeepPartial<SuppliesPurchase>;

  @IsUUID()
  supply: DeepPartial<Supply>;

  @IsUUID()
  supplier: DeepPartial<Supplier>;
  @IsInt()
  @IsPositive()
  amount: number;
  @IsInt()
  @IsPositive()
  total: number;
}
