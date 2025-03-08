
import { DeepPartial } from 'typeorm';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Type } from 'class-transformer';
import { SuppliesConsumption } from '../entities/supplies-consumption.entity';
import { Supply } from 'src/supplies/entities/supply.entity';

export class ConsumptionSuppliesDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;
  
  @ValidateNested()
  @Type(() => ValidateUUID)
  consumption: DeepPartial<SuppliesConsumption>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsInt()
  @IsPositive()
  amount: number;
}
