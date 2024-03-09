import { PartialType } from '@nestjs/mapped-types';
import { CreateConsumptionSuppliesDto } from './create-consumption-supplies.dto';

export class UpdateSuppliesConsumptionDto extends PartialType(
  CreateConsumptionSuppliesDto,
) {}
