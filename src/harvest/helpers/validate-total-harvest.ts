import { BadRequestException } from '@nestjs/common';
import { CreateHarvestDto } from '../dto/create-harvest.dto';
import { UpdateHarvestDto } from '../dto/update-harvest.dto';

export const validateTotalHarvest = (
  data: CreateHarvestDto | UpdateHarvestDto,
) => {
  const { details, ...rest } = data;

  const totalHarvest = rest.total;

  const totalArray = details.reduce((acumulador, record) => {
    return acumulador + record.total;
  }, 0);

  const isTotalValid = totalHarvest === totalArray;

  if (!isTotalValid) {
    throw new BadRequestException('Total harvest is not correct.');
  }
};
