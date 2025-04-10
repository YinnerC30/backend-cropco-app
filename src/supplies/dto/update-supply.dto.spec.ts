import { UpdateSupplyDto } from './update-supply.dto';
import { CreateSupplyDto } from './create-supply.dto';

describe('UpdateSupplyDto', () => {
  it('should be defined', () => {
    expect(new UpdateSupplyDto()).toBeDefined();
  });

  it('should allow partial updates', () => {
    const updateDto = new UpdateSupplyDto();
    const partialData = {
      name: 'Updated Supply',
    };
    Object.assign(updateDto, partialData);
    expect(updateDto.name).toBe('Updated Supply');
  });
});
