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
import { SuppliesShopping } from '../entities/supplies-shopping.entity';
import { Type } from 'class-transformer';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';

export class ShoppingSuppliesDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;

  @ValidateNested()
  @Type(() => ValidateUUID)
  shopping: DeepPartial<SuppliesShopping>;

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
