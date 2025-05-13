import { PartialType } from '@nestjs/mapped-types';
import { CreateCropDto } from './create-crop.dto';

export class UpdateCropDto extends PartialType(CreateCropDto) {}
