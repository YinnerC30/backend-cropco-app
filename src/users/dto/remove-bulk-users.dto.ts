import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ValidateUUID } from 'src/common/dto/validate-uuid';
import { DeepPartial } from 'typeorm';
import { User } from '../entities/user.entity';

export class RemoveBulkUsersDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => ValidateUUID)
  userIds: DeepPartial<User[]>;
}
