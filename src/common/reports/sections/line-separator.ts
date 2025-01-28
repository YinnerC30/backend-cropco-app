import { Content } from 'pdfmake/interfaces';

export const lineSeparator: Content = {
  table: {
    widths: ['*'], // La línea ocupa todo el ancho disponible
    body: [
      [{ text: '', border: [false, false, false, true] }], // Solo borde inferior
    ],
  },
  margin: [0, 10, 0, 10], // Márgenes alrededor de la línea
};
