import { BadRequestException } from '@nestjs/common';

interface PropertiesObject {
  propertyNameArray: string;
  namesPropertiesToSum: string[];
}

export const validateTotalInArray = (data: any, config: PropertiesObject) => {
  const array = data[config.propertyNameArray];

  const arrayValid = config.namesPropertiesToSum.map((prop) => {
    const totalArray = array.reduce((acc, record) => acc + record[prop], 0);
    return data[prop] === totalArray;
  });

  if (arrayValid.some((value) => !value)) {
    throw new BadRequestException('Total in array is not correct.');
  }
};

