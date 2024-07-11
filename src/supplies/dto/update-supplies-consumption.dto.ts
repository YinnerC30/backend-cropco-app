import { PartialType } from '@nestjs/swagger';
import { CreateConsumptionSuppliesDto } from './create-consumption-supplies.dto';

export class UpdateSuppliesConsumptionDto extends PartialType(
  CreateConsumptionSuppliesDto,
) {}
