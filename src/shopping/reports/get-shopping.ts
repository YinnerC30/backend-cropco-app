import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { SuppliesShopping } from '../entities';
import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';
import { FormatNumber } from 'src/common/helpers/formatNumber';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: SuppliesShopping;
}

export const getShoppingReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
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
      { text: 'Reporte de compra', style: 'header' },
      { text: `Fecha de la compra: ${data.date}`, margin: [0, 0, 0, 10] },

      // Información general
      { text: 'Información General', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['ID', data.id],
            ['Total', FormatMoneyValue(data.total)],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Detalles de compras
      { text: 'Detalles de las compras', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              'Proveedor',
              'Email',
              'Insumo',
              'Unidad de medida',
              'Teléfono',
              'Monto',
              'Valor a pagar',
            ],
            ...data.details.map((detail) => [
              `${detail.supplier.first_name} ${detail.supplier.last_name}`,
              detail.supplier.email,
              detail.supply.name,
              detail.supply.unit_of_measure,
              detail.supplier.cell_phone_number,
              FormatNumber(detail.amount),
              FormatMoneyValue(detail.total),
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
      summary: { fontSize: 14, italics: true, margin: [0, 10, 0, 0] },
    },
  };
};
