import { PartialType } from '@nestjs/swagger';
import { CreateCropDto } from './create-crop.dto';

export class UpdateCropDto extends PartialType(CreateCropDto) {}
