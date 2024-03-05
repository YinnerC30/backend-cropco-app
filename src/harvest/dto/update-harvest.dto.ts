import { PartialType } from '@nestjs/mapped-types';
import { CreateHarvestDto } from './create-harvest.dto';

export class UpdateHarvestDto extends PartialType(CreateHarvestDto) {}
