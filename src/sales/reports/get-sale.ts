import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { Sale } from '../entities/sale.entity';
import { FormatMoneyValue } from 'src/common/helpers/money-formatter';
import { FormatNumber } from 'src/common/helpers/number-formatter';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { text } from 'stream/consumers';
import { DateFormatter } from 'src/common/helpers';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Sale;
}

export const getSaleReport = (options: ReportOptions): TDocumentDefinitions => {
  const { title, subTitle, data } = options;

  const pathFrontend = process.env['HOST_FRONTED'] ?? 'http://localhost:5173';

  return {
    header: headerSection({
      title: 'Reporte de venta',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#606C38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-dollar-sign"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>'
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],

    content: [
      {
        text: [
          'Id: ',
          {
            text: `${data.id}`,
            link: `${pathFrontend}/app/home/sales/view/one/${data.id}`,
            style: 'link',
          },
        ],
        style: 'subtitle',
      },

      {
        text: `Fecha de la venta: ${DateFormatter.getSpanishDate(data.date)}`,
        style: 'subtitle',
      },

      // Información general
      { text: 'Resumen', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['Cantidad vendida: ', FormatNumber(data.quantity) + ' Kg'],
            ['Pago total: ', FormatMoneyValue(data.total)],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // Detalles
      { text: 'Detalles', style: 'subheader' },

      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Id Cliente', style: 'tableHeader' },
              { text: 'Cliente', style: 'tableHeader' },
              { text: 'Cultivo', style: 'tableHeader' },
              { text: 'Cantidad', style: 'tableHeader' },
              { text: 'Valor a pagar', style: 'tableHeader' },
              { text: 'Pendiente de pago', style: 'tableHeader' },
            ],
            ...data.details.map((detail) => [
              {
                text: detail.client.id,
                link: `${pathFrontend}/app/home/clients/view/one/${detail.client.id}`,
                style: ['tableCell', 'link'],
              },
              {
                text: `${detail.client.first_name} ${detail.client.last_name}`,
                style: 'tableCell',
              },
              {
                text: `${detail.crop.name}`,
                style: 'tableCell',
              },
              {
                text: FormatNumber(detail.quantity),
                style: 'tableCell',
                alignment: 'center',
              },
              {
                text: FormatMoneyValue(detail.total),
                style: 'tableCell',
                alignment: 'center',
              },
              {
                text: detail.is_receivable ? 'Sí' : 'No',
                alignment: 'center',
                color: detail.is_receivable ? '#9e0059' : '#2a9d8f',
                style: ['tableCell'],
              },
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Resumen

      {
        text: [
          'Cantidad vendida: ',
          {
            text: `${FormatNumber(data.quantity) + ' Kg'}`,
            style: 'boldText',
          },
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
