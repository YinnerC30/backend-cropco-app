import { BadRequestException } from '@nestjs/common';

interface MonthData {
  month: string;
  monthNumber: number;
  total: number;
  value_pay: number;
}

interface YearData {
  year: number;
  data: MonthData[];
}

interface DataStructure {
  last_year: YearData;
  previous_year: YearData;
}

export interface DataReturn {
  growth_value: number;
  total_current: number;
  total_previous: number;
  diference: number;
  is_increment: boolean;
}

export function calculateGrowthHarvest({
  last_year,
  previous_year,
}: DataStructure): DataReturn {
  // Ordenamos los años de menor a mayor por si no están ordenados

  // Tomamos el último y el penúltimo año
  const lastYear = last_year;
  const previousYear = previous_year;

  // Sumamos los totales de cada año
  const totalLastYear = lastYear.data.reduce(
    (acc, month) => acc + month.total,
    0,
  );
  const totalPreviousYear = previousYear.data.reduce(
    (acc, month) => acc + month.total,
    0,
  );

  if (totalPreviousYear === 0) {
    throw new BadRequestException(
      'No se puede calcular el crecimiento porque el total del año anterior es 0.',
    );
  }

  const diference = totalLastYear - totalPreviousYear;

  // Aplicamos la fórmula
  const growthValue = (diference / totalPreviousYear) * 100;

  return {
    growth_value: growthValue,
    diference: diference,
    is_increment: diference > 0,
    total_current: totalLastYear,
    total_previous: totalPreviousYear,
  };
}
