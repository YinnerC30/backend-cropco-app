import { IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { DeepPartial } from 'typeorm';
import { Sale } from '../entities/sale.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Client } from 'src/clients/entities/client.entity';

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
  @IsUUID()
  crop: DeepPartial<Crop>;
  @IsUUID()
  client: DeepPartial<Client>;
}
