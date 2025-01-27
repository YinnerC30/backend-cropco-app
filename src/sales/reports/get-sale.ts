import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { Sale } from '../entities/sale.entity';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Sale;
}

export const getSaleReport = (options: ReportOptions): TDocumentDefinitions => {
  const { title, subTitle, data } = options;

  return {
    // pageOrientation: 'landscape',
    // header: headerSection({
    //   title: title ?? 'Reporte de Cosecha',
    //   subTitle: subTitle ?? 'No hay subtitulo',
    // }),
    // footer: footerSection,
    // pageMargins: [40, 110, 40, 60],

    content: [
      { text: 'Reporte de venta', style: 'header' },
      { text: `Fecha del venta: ${data.date}`, margin: [0, 0, 0, 10] },

      // Información general
      { text: 'Información General', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['ID', data.id],
            ['Cantidad Total', data.quantity],
            ['Total ($)', data.total],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Detalles
      { text: 'Detalles', style: 'subheader' },

      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            ['Nombre', 'Cultivo', 'Cantidad', 'Total', 'Pendiente de pago'],
            ...data.details.map((detail) => [
              `${detail.client.first_name} ${detail.client.last_name}`,
              detail.crop.name,
              detail.quantity,
              detail.total,
              detail.is_receivable ? 'Sí' : 'No',
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Resumen
      { text: 'Resumen', style: 'subheader' },
      { text: `Cantidad Total: ${data.quantity}`, style: 'summary' },
      { text: `Total Acumulado: ${data.total} $`, style: 'summary' },
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
      subheaderSmall: { fontSize: 14, bold: true, margin: [0, 5, 0, 3] },
      summary: { fontSize: 14, italics: true, margin: [0, 10, 0, 0] },
    },
  };
};
