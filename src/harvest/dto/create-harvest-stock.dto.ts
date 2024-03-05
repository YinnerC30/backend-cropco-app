import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

export class HarvestStockDto {
  @IsUUID()
  cropId: string;
  @IsInt()
  @IsPositive()
  total: number;
}
