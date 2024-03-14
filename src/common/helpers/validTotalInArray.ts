import { BadRequestException } from '@nestjs/common';

export const validateTotalInArray = (data: any) => {
  const { details, ...rest } = data;

  // Validar valores numéricos
  const total = rest.total;

  const totalArray = details.reduce((acumulador, record) => {
    return acumulador + record.total;
  }, 0);

  const isTotalValid = total === totalArray;

  if (!isTotalValid) {
    throw new BadRequestException('Total in array is not correct.');
  }
};
