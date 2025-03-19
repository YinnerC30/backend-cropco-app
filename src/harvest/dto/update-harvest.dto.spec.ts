import { validate } from 'class-validator';
import { UpdateHarvestDto } from './update-harvest.dto';

describe('UpdateHarvestDto', () => {
  it('should be defined', () => {
    expect(new UpdateHarvestDto()).toBeDefined();
  });

  it('should allow partial updates', async () => {
    const updateHarvestDto = new UpdateHarvestDto();
    const partialData = {
      total: 50,
      // Other fields can be omitted since it's partial
    };
    Object.assign(updateHarvestDto, partialData);
    const errors = await validate(updateHarvestDto);
    expect(errors.length).toBe(0);
  });
});
