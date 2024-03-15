import { BadRequestException } from '@nestjs/common';
import { CreatePurchaseSuppliesDto } from '../dto/create-purchase-supplies.dto';
import { UpdateSuppliesPurchaseDto } from '../dto/update-supplies-purchase.dto';

export const validateTotalPurchase = (
  data: UpdateSuppliesPurchaseDto | CreatePurchaseSuppliesDto,
) => {
  const { details, ...rest } = data;

  const totalPurchase = rest.total;

  const totalArray = details.reduce((acumulador, record) => {
    return acumulador + record.total;
  }, 0);

  const isTotalValid = totalPurchase === totalArray;

  if (!isTotalValid) {
    throw new BadRequestException('Total purchase of supplies is not correct.');
  }
};
