import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { DeepPartial } from 'typeorm';

export class RemoveBulkRecordsDto<T> {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  recordsIds: DeepPartial<T[]>;
}
