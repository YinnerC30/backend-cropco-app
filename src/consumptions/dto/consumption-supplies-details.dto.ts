import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';
import { AllUnitTypesDto } from 'src/common/utils/UnitTypesDto';
import { Crop } from 'src/crops/entities/crop.entity';
import { Supply } from 'src/supplies/entities/supply.entity';
import { DeepPartial } from 'typeorm';
import { SuppliesConsumption } from '../entities/supplies-consumption.entity';

export class ConsumptionSuppliesDetailsDto {
  @IsUUID(4)
  @IsOptional()
  id: string;

  @ValidateNested()
  @Type(() => ValidateUUID)
  consumption: DeepPartial<SuppliesConsumption>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @IsString()
  @IsNotEmpty()
  @IsIn(AllUnitTypesDto)
  unit_of_measure: UnitType;

  @IsNumber()
  @IsPositive()
  amount: number;
}
