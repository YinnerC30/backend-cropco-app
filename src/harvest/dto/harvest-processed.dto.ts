import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { Crop } from 'src/crops/entities/crop.entity';
import { DeepPartial } from 'typeorm';
import { Harvest } from '../entities/harvest.entity';

export class HarvestProcessedDto {
  @ApiProperty({
    description: 'Fecha del procesamiento de la cosecha',
    format: 'date',
    example: '2024-07-11',
    type: String,
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'ID del cultivo asociado al procesamiento',
    type: () => ValidateUUID,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  crop: DeepPartial<Crop>;

  @ApiProperty({
    description: 'Cosecha asociada al procesamiento',
    type: ValidateUUID,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => ValidateUUID)
  harvest: DeepPartial<Harvest>;

  @ApiProperty({
    description: 'Cantidad total procesada',
    example: 100,
    type: Number,
  })
  @IsInt()
  @IsPositive()
  amount: number;
}
