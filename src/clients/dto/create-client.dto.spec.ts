import { validate } from 'class-validator';
import { CreateClientDto } from './create-client.dto';

describe('CreateClientDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new CreateClientDto();
    dto.first_name = 'NameDemo';
    dto.last_name = 'LastNameDemo';
    dto.email = 'emaildemo@gmail.com';
    dto.cell_phone_number = '3104567896';
    dto.address = 'Calle 123, Ciudad, País';
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should be invalid because there are missing properties in the object', async () => {
    const dto = new CreateClientDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(5);
  });

  it('should throw error for sending an incorrect email address', async () => {
    const dto = new CreateClientDto();
    dto.email = 'emaildemo';
    const errors = await validate(dto);

    const constrain = errors.find((e) => e.property === 'email');
    expect(constrain.constraints.isEmail).toBe('email must be an email');
  });
  it('should throw error for sending an incorrect cell phone number', async () => {
    const dto = new CreateClientDto();
    dto.cell_phone_number = '312456432';
    const errors = await validate(dto);
    const constrain = errors.find((e) => e.property === 'cell_phone_number');
    expect(constrain.constraints.isColombianPhone).toBeDefined();
  });
});
