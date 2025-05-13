import { IsEmail, IsNumberString, IsString, MaxLength } from 'class-validator';
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
  @MaxLength(10)
  @IsColombianPhone({
    message: 'El número de celular debe ser válido para Colombia.',
  })
  cell_phone_number: string;

  @IsString()
  @MaxLength(200)
  address: string;
}
