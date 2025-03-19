interface MonthData {
  month: string;
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
  difference: number;
  status: 'increment' | 'decrement' | 'stable' | 'no-valid';
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

  if (totalLastYear === 0 && totalPreviousYear === 0) {
    return {
      growth_value: 0,
      difference: 0,
      status: 'no-valid',
      total_current: 0,
      total_previous: 0,
    };
  }

  const difference = totalLastYear - totalPreviousYear;

  if (totalPreviousYear === 0) {
    return {
      growth_value: 100,
      difference: difference,
      status: 'no-valid',
      total_current: totalLastYear,
      total_previous: totalPreviousYear,
    };
  }

  // Aplicamos la fórmula
  const growthValue = (difference / totalPreviousYear) * 100;

  return {
    growth_value: growthValue,
    difference: difference,
    status:
      difference > 0 ? 'increment' : difference < 0 ? 'decrement' : 'stable',
    total_current: totalLastYear,
    total_previous: totalPreviousYear,
  };
}
