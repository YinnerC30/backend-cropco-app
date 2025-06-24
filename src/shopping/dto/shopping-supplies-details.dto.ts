import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';
import { DeepPartial } from 'typeorm';
import { Supply } from 'src/supplies/entities';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliesShopping } from '../entities/supplies-shopping.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';

export class ShoppingSuppliesDetailsDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => String)
  shopping?: DeepPartial<SuppliesShopping>;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supplier: DeepPartial<Supplier>;

  @IsNumber()
  @IsPositive()
  value_pay: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    'KILOGRAMOS',
    'LIBRAS',
    'ONZAS',
    'TONELADAS',
    // Unidades de volumen
    'MILILITROS',
    'LITROS',
    'GALONES',
    // 'ONZAS_FLUIDAS',
    // 'CUCHARADAS',
    // 'CUCHARADAS_SOPERAS',
  ])
  unit_of_measure: UnitType;

  // @IsOptional()
  // @IsString()
  // observation?: string;
}
