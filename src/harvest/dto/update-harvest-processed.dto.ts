import { PartialType } from '@nestjs/mapped-types';
import { CreateHarvestProcessedDto } from './create-harvest-processed.dto';

export class UpdateHarvestProcessedDto extends PartialType(
  CreateHarvestProcessedDto,
) {}
