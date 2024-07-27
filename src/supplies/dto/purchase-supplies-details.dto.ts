import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from '../entities/supply.entity';
import { DeepPartial } from 'typeorm';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SuppliesPurchase } from '../entities/supplies-purchase.entity';
import { Type } from 'class-transformer';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';

export class PurchaseSuppliesDetailsDto {
  @ValidateNested()
  @Type(() => ValidateUUID)
  purchase: DeepPartial<SuppliesPurchase>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  supplier: DeepPartial<Supplier>;

  @IsInt()
  @IsPositive()
  amount: number;
  @IsInt()
  @IsPositive()
  total: number;
}
