import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  email: string;
  @IsString()
  @MaxLength(10)
  password: string;
}
