import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { DeepPartial } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentCategoriesDto {
  @ApiProperty({
    description: 'Detalles de cosechas relacionadas',
    type: [String],
    example: ['uuid4'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  harvests: DeepPartial<HarvestDetails>[];

  @ApiProperty({
    description: 'Detalles de trabajos relacionados',
    type: [String],
    example: ['uuid4'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  works: DeepPartial<WorkDetails>[];
}
