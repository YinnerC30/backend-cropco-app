import { IsEmail, IsNumberString, IsString, MaxLength, MinLength } from 'class-validator';
import { IsColombianPhone } from 'src/common/decorators/is-colombian-phone.decorator';

export class CreateClientDto {
  @IsString()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @MaxLength(100)
  last_name: string;

  @IsString()
  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsNumberString()
  @MinLength(9)
  @MaxLength(15)
  cell_phone_number: string;

  @IsString()
  @MaxLength(200)
  address: string;
}
