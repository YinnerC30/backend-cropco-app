import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Client } from 'src/clients/entities/client.entity';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';
import { MassUnitDto } from 'src/common/utils/UnitTypesDto';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';

export class SaleDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(MassUnitDto)
  unit_of_measure: MassUnit;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
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
