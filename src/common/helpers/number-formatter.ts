export const FormatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-CO').format(value);
};
