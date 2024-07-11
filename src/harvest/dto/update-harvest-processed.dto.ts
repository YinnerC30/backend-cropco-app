import { PartialType } from '@nestjs/swagger';
import { CreateHarvestProcessedDto } from './create-harvest-processed.dto';

export class UpdateHarvestProcessedDto extends PartialType(
  CreateHarvestProcessedDto,
) {}
