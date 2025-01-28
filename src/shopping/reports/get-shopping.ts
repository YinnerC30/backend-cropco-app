import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { SuppliesShopping } from '../entities';
import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';
import { FormatNumber } from 'src/common/helpers/formatNumber';
import { formatDate } from 'src/common/helpers/formatDate';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: SuppliesShopping;
}

export const getShoppingReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
  const { title, subTitle, data } = options;

  const pathFrontend = process.env['HOST_FRONTED'] ?? 'http://localhost:5173';

  return {
    header: headerSection({
      title: 'Reporte de compra',
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],
    content: [
      {
        text: [
          'Id: ',
          {
            text: `${data.id}`,
            link: `${pathFrontend}/app/home/shopping/view/one/${data.id}`,
            style: 'link',
          },
        ],
        style: 'subtitle',
      },

      {
        text: `Fecha de la compra: ${formatDate(data.date)}`,
        style: 'subtitle',
      },

      // Detalles de compras
      { text: 'Detalles de las compra', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              {
                text: 'Id Proveedor',
                style: 'tableHeader',
              },
              {
                text: 'Proveedor',
                style: 'tableHeader',
              },
              {
                text: 'Insumo',
                style: 'tableHeader',
              },
              {
                text: 'Unidad de medida',
                style: 'tableHeader',
              },

              {
                text: 'Monto',
                style: 'tableHeader',
              },
              {
                text: 'Valor a pagar',
                style: 'tableHeader',
              },
            ],
            ...data.details.map((detail) => [
              {
                text: detail.supplier.id,
                link: `${pathFrontend}/app/home/suppliers/view/one/${detail.supplier.id}`,
                style: ['tableCell', 'link'],
              },
              {
                text: `${detail.supplier.first_name} ${detail.supplier.last_name}`,
                style: 'tableCell',
              },

              {
                text: detail.supply.name,
                style: 'tableCell',
              },
              {
                text: detail.supply.unit_of_measure,
                style: 'tableCell',
              },

              {
                text: FormatNumber(detail.amount),
                style: ['tableCell'],
                alignment: 'center',
              },
              {
                text: FormatMoneyValue(detail.total),
                style: ['tableCell'],
                alignment: 'center',
              },
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },

      {
        text: [
          '\nTotal a pagar: ',
          {
            text: `${FormatMoneyValue(data.total)}`,
            style: 'boldText',
          },
        ],
      },
    ],
    styles: MyStyles,
  };
};
