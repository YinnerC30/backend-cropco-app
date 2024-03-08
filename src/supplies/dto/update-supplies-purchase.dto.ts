import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseSuppliesDto } from './create-purchase-supplies.dto';

export class UpdateSuppliesPurchaseDto extends PartialType(
  CreatePurchaseSuppliesDto,
) {}
