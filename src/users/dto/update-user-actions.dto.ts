import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { ValidateUUID } from 'src/common/dto/ValidateUUID.dto';
import { UserActions } from 'src/users/entities/user-actions.entity';
import { User } from 'src/users/entities/user.entity';
import { DeepPartial } from 'typeorm';
import { UserActionDto } from './user-action.dto';

export class UpdateUserActionsDto {
  @ValidateNested()
  @Type(() => ValidateUUID)
  user: DeepPartial<User>;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => UserActionDto)
  actions: UserActionDto[];
}
