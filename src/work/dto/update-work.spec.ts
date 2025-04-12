import { validate } from 'class-validator';
import { UpdateWorkDto } from './update-work.dto';

describe('UpdateWorkDto', () => {
  it('should be defined', () => {
    expect(new UpdateWorkDto()).toBeDefined();
  });

  it('should allow partial updates', async () => {
    const updateHarvestDto = new UpdateWorkDto();
    const partialData = {
      value_pay: 50,
      // Other fields can be omitted since it's partial
    };
    Object.assign(updateHarvestDto, partialData);
    const errors = await validate(updateHarvestDto);
    expect(errors.length).toBe(0);
  });
});
