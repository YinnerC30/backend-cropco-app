import { IsIn, IsString, MaxLength } from 'class-validator';
import { UnitOfMeasure } from '../entities/supply.entity';

export class CreateSupplyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  brand: string;

  @IsString()
  @MaxLength(50)
  @IsIn(['GRAMOS', 'MILILITROS'])
  unit_of_measure: UnitOfMeasure;
  @IsString()
  @MaxLength(500)
  observation: string;
}
