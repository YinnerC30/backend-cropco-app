import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Work } from 'src/work/entities/work.entity';
import { DeepPartial } from 'typeorm';

export class PaymentCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  harvests: DeepPartial<HarvestDetails>[];

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  works: DeepPartial<Work>[];
}
