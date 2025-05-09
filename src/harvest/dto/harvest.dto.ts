import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsDateString,
  IsDefined,
  IsInt,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { HarvestDetailsDto } from './harvest-details.dto';
import { MatchTotals } from 'src/common/decorators/match-totals.decorator';
import { UniqueRecordIdInArray } from 'src/common/decorators/unique-id-in-array.decorator';

export class HarvestDto {
  @ApiProperty({
    description: 'Fecha de la cosecha',
    format: 'date',
    example: '2024-07-11',
    type: String,
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Cultivo asociado a la cosecha',
    type: () => ValidateUUID,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @ApiProperty({
    description: 'Cantidad total cosechada',
    example: 100,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'Valor de pago por la cosecha',
    example: 500,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  value_pay: number;

  @ApiProperty({
    description: 'Observaciones adicionales',
    example: 'Cosecha de alta calidad',
    type: String,
  })
  @IsString()
  observation: string;

  @ApiProperty({
    description: 'Detalles específicos de la cosecha',
    type: () => [HarvestDetailsDto],
  })
  @ArrayNotEmpty()
  @MatchTotals({
    fields: ['amount', 'value_pay'],
    nameArrayToCalculate: 'details',
  })
  @UniqueRecordIdInArray('employee')
  @ValidateNested({ each: true })
  @Type(() => HarvestDetailsDto)
  details: HarvestDetailsDto[];
}
