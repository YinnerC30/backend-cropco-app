import {
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Type } from 'class-transformer';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';

export class SaleDetailsDto {
  @IsInt()
  @IsPositive()
  quantity: number;

  @IsInt()
  @IsPositive()
  total: number;

  @IsOptional()
  @IsUUID()
  sale: DeepPartial<Sale>;

  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;
  
  @ValidateNested()
  @Type(() => ValidateUUID)
  client: DeepPartial<Client>;
}
