import { PartialType } from '@nestjs/swagger';
import { CreateSupplyDto } from './create-supply.dto';

export class UpdateSupplyDto extends PartialType(CreateSupplyDto) {}
