import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';

import { DateFormatter } from 'src/common/helpers';
import { FormatMoneyValue } from 'src/common/helpers/money-formatter';
import { FormatNumber } from 'src/common/helpers/number-formatter';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { Payment } from '../entities/payment.entity';
import { buildFrontendURL } from 'src/common/utils/constants';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Payment;
  subdomain: string;
}

export const getPaymentReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
  const { title, subTitle, data, subdomain } = options;

  const pathFrontend = buildFrontendURL(subdomain).url;

  return {
    header: headerSection({
      title: 'Reporte de pago',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#606C38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
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
        text: `Fecha del pago: ${DateFormatter.getSpanishDate(data.date)}`,
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
              { text: FormatMoneyValue(data.value_pay), style: 'boldText' },
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
                    widths: [120, 'auto', 'auto', 'auto'],
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
                          text: DateFormatter.getSpanishDate(
                            harvests_detail.harvest.date,
                          ),
                          style: 'tableCell',
                        },
                        {
                          text: FormatNumber(harvests_detail.amount) + ' Kg',
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
                    widths: [120, 'auto', 'auto'],
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
                          text: DateFormatter.getSpanishDate(
                            works_detail.work.date,
                          ),
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
