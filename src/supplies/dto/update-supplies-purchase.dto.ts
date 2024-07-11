import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseSuppliesDto } from './create-purchase-supplies.dto';

export class UpdateSuppliesPurchaseDto extends PartialType(
  CreatePurchaseSuppliesDto,
) {}
