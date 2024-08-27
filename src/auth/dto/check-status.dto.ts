import { IsJWT } from 'class-validator';

export class CheckAuthStatusDto {
  @IsJWT()
  token: string;
}
