import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

export class HarvestStockDto {
  @IsUUID()
  crop: DeepPartial<Crop>;
  @IsInt()
  @IsPositive()
  total: number;
}
