import { validate } from 'class-validator';
import { UpdateHarvestProcessedDto } from './update-harvest-processed.dto';

describe('UpdateHarvestProcessedDto', () => {
  it('should be defined', () => {
    expect(new UpdateHarvestProcessedDto()).toBeDefined();
  });

  it('should allow partial updates', async () => {
    const updateHarvestProcessedDto = new UpdateHarvestProcessedDto();
    const partialData = {
      total: 50,
      // Other fields can be omitted since it's partial
    };
    Object.assign(updateHarvestProcessedDto, partialData);
    const errors = await validate(updateHarvestProcessedDto);
    expect(errors.length).toBe(0);
  });
});
