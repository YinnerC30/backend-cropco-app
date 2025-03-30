import { PartialType } from '@nestjs/swagger';
import { CreateHarvestProcessedDto } from './create-harvest-processed.dto';

export class UpdateHarvestProcessedDto extends PartialType(
  CreateHarvestProcessedDto,
) {}

// TODO: Obligar que se envié el id de la cosecha