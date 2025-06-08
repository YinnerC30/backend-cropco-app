
import { DeepPartial } from 'typeorm';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Type } from 'class-transformer';
import { SuppliesConsumption } from '../entities/supplies-consumption.entity';
import { Supply } from 'src/supplies/entities/supply.entity';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

export class ConsumptionSuppliesDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;
  
  @ValidateNested()
  @Type(() => ValidateUUID)
  consumption: DeepPartial<SuppliesConsumption>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

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

  @IsInt()
  @IsPositive()
  amount: number;
}
