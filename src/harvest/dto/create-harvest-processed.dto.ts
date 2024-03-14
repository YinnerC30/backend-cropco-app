import { IsDateString, IsInt, IsPositive, IsUUID } from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class CreateHarvestProcessedDto {
  @IsDateString()
  date: string;

  @IsUUID()
  crop: DeepPartial<Crop>;

  @IsUUID()
  harvest: DeepPartial<Harvest>;

  @IsInt()
  @IsPositive()
  total: number;
}
