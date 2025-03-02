import { validate } from 'class-validator';
import { UpdateClientDto } from './update-client.dto';

describe('UpdateClientDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new UpdateClientDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
