import { IsDefined, IsNumber, IsPositive, ValidateNested } from 'class-validator';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Type } from 'class-transformer';

export class HarvestStockDto {
  @ValidateNested()
  @IsDefined()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsNumber()
  @IsPositive()
  amount: number;
}
