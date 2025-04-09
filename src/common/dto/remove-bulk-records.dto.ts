import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';

export class RemoveBulkRecordsDto<T> {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ValidateUUID)
  recordsIds: ValidateUUID[];
}
