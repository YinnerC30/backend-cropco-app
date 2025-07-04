import { IsIn, IsString, Length } from 'class-validator';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

export class CreateSupplyDto {
  @IsString()
  @Length(4, 100)
  name: string;

  @IsString()
  @Length(3, 100)
  brand: string;

  @IsString()
  @IsIn([
    // Unidades de masa
    'GRAMOS',
    // Unidades de volumen
    'MILILITROS',
  ])
  unit_of_measure: UnitType;

  @IsString()
  @Length(10, 500)
  observation: string;
}
