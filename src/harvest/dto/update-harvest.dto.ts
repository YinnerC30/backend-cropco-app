import { PartialType } from '@nestjs/swagger';
import { CreateHarvestDto } from './create-harvest.dto';

export class UpdateHarvestDto extends PartialType(CreateHarvestDto) {}
