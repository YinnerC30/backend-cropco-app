import { Type } from 'class-transformer';
import {
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
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from 'src/supplies/entities';
import { DeepPartial } from 'typeorm';

export class ShoppingSuppliesDetailsDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  // @IsOptional()
  // @ValidateNested()
  // @Type(() => String)
  // shopping?: DeepPartial<SuppliesShopping>;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supply: DeepPartial<Supply>;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  supplier: DeepPartial<Supplier>;

  @IsNumber()
  @IsPositive()
  value_pay: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(AllUnitTypesDto)
  unit_of_measure: UnitType;

  // @IsOptional()
  // @IsString()
  // observation?: string;
}
