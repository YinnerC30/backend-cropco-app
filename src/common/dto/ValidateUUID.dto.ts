import { IsUUID } from "class-validator";

export class ValidateUUID {
  @IsUUID()
  id: string;
}
