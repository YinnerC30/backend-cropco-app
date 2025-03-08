export function FormatMoneyValue(value: number): string {
  const formattedValue = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(value);
  return formattedValue.replace(/\s/g, ' ').replace(/,00$/, '');
}
