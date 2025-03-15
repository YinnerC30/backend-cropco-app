import { validate } from 'class-validator';
import { UpdateCropDto } from './update-crop.dto';

describe('UpdateCropDto', () => {
  it('should be valid with correct data', async () => {
    const dto = new UpdateCropDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
