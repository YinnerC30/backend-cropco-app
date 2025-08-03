import {
  IsString,
  IsEmail,
  Length,
  Matches,
  IsNotEmpty,
  MaxLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Lista de subdominios reservados que no se pueden usar
const RESERVED_SUBDOMAINS = [
  'www',
  'mail',
  'ftp',
  'admin',
  'api',
  'app',
  'blog',
  'shop',
  'store',
  'support',
  'help',
  'news',
  'test',
  'dev',
  'staging',
  'prod',
  'production',
  'dashboard',
  'panel',
  'control',
  'manage',
  'secure',
  'ssl',
  'cdn',
  'static',
  'port',
  'back',
  'cropco',
];

// Validador personalizado para subdominios reservados
@ValidatorConstraint({ name: 'isNotReservedSubdomain', async: false })
export class IsNotReservedSubdomainConstraint implements ValidatorConstraintInterface {
  validate(subdomain: string, args: ValidationArguments): boolean {
    return !RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Este subdominio está reservado y no puede ser utilizado';
  }
}

// Validador personalizado para evitar subdominios que sean solo números
@ValidatorConstraint({ name: 'isNotOnlyNumbers', async: false })
export class IsNotOnlyNumbersConstraint implements ValidatorConstraintInterface {
  validate(subdomain: string, args: ValidationArguments): boolean {
    return !/^\d+$/.test(subdomain);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'El subdominio no puede ser solo números';
  }
}

// Validador personalizado para nombres de empresa sin espacios vacíos
@ValidatorConstraint({ name: 'isNotEmptyString', async: false })
export class IsNotEmptyStringConstraint implements ValidatorConstraintInterface {
  validate(text: string, args: ValidationArguments): boolean {
    return text && text.trim().length > 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'El campo no puede estar vacío';
  }
}

// Validador personalizado para números de teléfono
@ValidatorConstraint({ name: 'isValidPhoneNumber', async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: string, args: ValidationArguments): boolean {
    // Remover espacios y caracteres especiales para validar solo números
    const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    return /^\+?[1-9]\d{8,14}$/.test(cleanNumber);
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Formato de número de celular no válido';
  }
}

export class CreateTenantDto {
  @IsString({ message: 'El subdominio debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El subdominio es requerido' })
  @Length(3, 63, {
    message: 'El subdominio debe tener entre 3 y 63 caracteres',
  })
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, {
    message:
      'El subdominio solo puede contener letras minúsculas, números y guiones. No puede empezar o terminar con guión',
  })
  @Matches(/^(?!.*--)/, {
    message: 'El subdominio no puede contener guiones consecutivos',
  })
  @Validate(IsNotReservedSubdomainConstraint)
  @Validate(IsNotOnlyNumbersConstraint)
  subdomain: string;

  @IsString({ message: 'El nombre de la empresa debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  @MaxLength(100, {
    message: 'El nombre de la empresa no puede exceder 100 caracteres',
  })
  @Matches(/^[a-zA-ZÀ-ÿ0-9\s\-&.,]+$/, {
    message: 'El nombre de la empresa contiene caracteres no válidos',
  })
  @Validate(IsNotEmptyStringConstraint, {
    message: 'El nombre de la empresa no puede estar vacío',
  })
  company_name: string;

  @IsString({ message: 'El correo electrónico debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  @Matches(/^\S+$/, {
    message: 'El correo electrónico no puede contener espacios',
  })
  email: string;

  @IsString({ message: 'El número de celular debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El número de celular es requerido' })
  @Matches(/^\+?[1-9]\d{8,14}$/, {
    message:
      'El número de celular debe tener entre 9 y 15 dígitos y puede incluir el código de país con +',
  })
  @Validate(IsValidPhoneNumberConstraint)
  cell_phone_number: string;
}
