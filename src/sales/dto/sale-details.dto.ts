import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Client } from 'src/clients/entities/client.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

export class SaleDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    'KILOGRAMOS',
    'LIBRAS',
    'ONZAS',
    'TONELADAS',
  ])
  unit_of_measure: MassUnit;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  value_pay: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  client: DeepPartial<Client>;

  @IsBoolean()
  is_receivable: boolean;
}
