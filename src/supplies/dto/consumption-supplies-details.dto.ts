import { Supply, SuppliesConsumption } from '../entities/index';
import { DeepPartial } from 'typeorm';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { Type } from 'class-transformer';

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
