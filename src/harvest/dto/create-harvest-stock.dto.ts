import { IsDefined, IsInt, IsPositive, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Type } from 'class-transformer';

export class HarvestStockDto {
  @ValidateNested()
  @IsDefined()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsInt()
  @IsPositive()
  total: number;
}
