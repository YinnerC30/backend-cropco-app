import { IsIn, IsString, Length, MaxLength } from 'class-validator';
import { UnitOfMeasure } from '../entities/supply.entity';

export class CreateSupplyDto {
  @IsString()
  @Length(4, 100)
  name: string;

  @IsString()
  @Length(3, 100)
  brand: string;

  @IsString()
  @IsIn(['GRAMOS', 'MILILITROS'])
  unit_of_measure: UnitOfMeasure;

  @IsString()
  @Length(10, 500)
  observation: string;
}
