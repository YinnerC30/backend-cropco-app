import { PartialType } from '@nestjs/swagger';
import { CreateShoppingSuppliesDto } from './create-shopping-supplies.dto';

export class UpdateSuppliesShoppingDto extends PartialType(
  CreateShoppingSuppliesDto,
) {}
