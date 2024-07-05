import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { Work } from 'src/work/entities/work.entity';
import { DeepPartial } from 'typeorm';

export class PaymentCategoriesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  harvests: DeepPartial<HarvestDetails>[];

  @IsArray()
  @IsUUID('4', { each: true })
  works: DeepPartial<WorkDetails>[];

  // Encontrar la forma de validar que hayan datos en los arrays
}
