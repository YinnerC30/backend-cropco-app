import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';

import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';
import { FormatNumber } from 'src/common/helpers/formatNumber';
import { Payment } from '../entities/payment.entity';
import { formatDate } from 'src/common/helpers/formatDate';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { text } from 'node:stream/consumers';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Payment;
}

const pathFrontend = process.env['HOST_FRONTED'] ?? 'http://localhost:5173';

export const getPaymentReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
  const { title, subTitle, data } = options;

  return {
    header: headerSection({
      title: 'Reporte de pago',
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],
    content: [
      {
        text: [
          'Id: ',
          {
            text: `${data.id}`,
            link: `${pathFrontend}/app/home/payments/view/one/${data.id}`,
            style: 'link',
          },
        ],
        style: 'subtitle',
      },

      {
        text: `Fecha del pago: ${formatDate(data.date)}`,
        style: 'subtitle',
      },

      // Información general
      { text: 'Resumen', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            [
              'Total a pagar: ',
              { text: FormatMoneyValue(data.total), style: 'boldText' },
            ],
            [
              'Metodo de pago: ',
              { text: data.method_of_payment, style: 'boldText' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // Información del cultivo
      { text: 'Información del empleado', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            [
              'Nombre(s): ',
              { text: data.employee.first_name, style: 'boldText' },
            ],
            [
              'Apellido(s): ',
              { text: data.employee.last_name, style: 'boldText' },
            ],
            ['Correo: ', { text: data.employee.email, style: 'boldText' }],
            [
              'Celular: ',
              { text: data.employee.cell_phone_number, style: 'boldText' },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 10],
      },

      // Detalles de pagos - cosecha
      {
        stack:
          data.payments_harvest.length > 0
            ? [
                { text: 'Detalles de los pagos - Cosecha', style: 'subheader' },
                {
                  table: {
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto', 'auto'],
                    body: [
                      [
                        { text: 'ID', style: 'tableHeader' },
                        { text: 'Fecha', style: 'tableHeader' },
                        { text: 'Total', style: 'tableHeader' },
                        { text: 'Valor a pagar', style: 'tableHeader' },
                      ],
                      ...data.payments_harvest.map(({ harvests_detail }) => [
                        {
                          text: harvests_detail.harvest.id,
                          link: `${pathFrontend}/app/home/harvests/view/one/${harvests_detail.harvest.id}`,
                          style: 'link',
                        },
                        {
                          text: formatDate(harvests_detail.harvest.date),
                          style: 'tableCell',
                        },
                        {
                          text: FormatNumber(harvests_detail.total) + ' Kg',
                          style: 'tableCell',
                          alignment: 'center',
                        },
                        {
                          text: FormatMoneyValue(harvests_detail.value_pay),
                          style: 'tableCell',
                          alignment: 'center',
                        },
                      ]),
                    ],
                  },
                  margin: [0, 0, 0, 10],
                },
              ]
            : [{ text: '' }],
      },

      // Detalles de pagos - trabajo
      {
        stack:
          data.payments_work.length > 0
            ? [
                { text: 'Detalles de los pagos - Trabajo', style: 'subheader' },
                {
                  table: {
                    headerRows: 1,
                    widths: ['auto', 'auto', 'auto'],
                    body: [
                      [
                        { text: 'ID', style: 'tableHeader' },
                        { text: 'Fecha', style: 'tableHeader' },

                        { text: 'Valor a pagar', style: 'tableHeader' },
                      ],
                      ...data.payments_work.map(({ works_detail }) => [
                        {
                          text: works_detail.work.id,
                          link: `${pathFrontend}/app/home/works/view/one/${works_detail.work.id}`,
                          style: 'link',
                        },
                        {
                          text: formatDate(works_detail.work.date),
                          style: 'tableCell',
                        },

                        {
                          text: FormatMoneyValue(works_detail.value_pay),
                          style: 'tableCell',
                          alignment: 'center',
                        },
                      ]),
                    ],
                  },
                  margin: [0, 0, 0, 10],
                },
              ]
            : [{ text: '' }],
      },
    ],
    styles: MyStyles,
  };
};
