import { Supply, SuppliesConsumption } from '../entities/index';
import { DeepPartial } from 'typeorm';
import { IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';

export class ConsumptionSuppliesDetailsDto {
  @IsOptional()
  @IsUUID()
  consumption: DeepPartial<SuppliesConsumption>;

  @IsUUID()
  supply: DeepPartial<Supply>;

  @IsUUID()
  crop: DeepPartial<Crop>;

  @IsInt()
  @IsPositive()
  amount: number;
}
