import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { Work } from '../entities/work.entity';
import { FormatMoneyValue } from 'src/common/helpers/money-formatter';
import { FormatNumber } from 'src/common/helpers/number-formatter';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { DateFormatter } from 'src/common/helpers';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Work;
}

export const getWorkReport = (options: ReportOptions): TDocumentDefinitions => {
  const { title, subTitle, data } = options;

  const pathFrontend = process.env['HOST_FRONTED'] ?? 'http://localhost:5173';

  return {
    header: headerSection({
      title: 'Reporte de trabajo',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#606C38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pickaxe"><path d="M14.531 12.469 6.619 20.38a1 1 0 1 1-3-3l7.912-7.912"/><path d="M15.686 4.314A12.5 12.5 0 0 0 5.461 2.958 1 1 0 0 0 5.58 4.71a22 22 0 0 1 6.318 3.393"/><path d="M17.7 3.7a1 1 0 0 0-1.4 0l-4.6 4.6a1 1 0 0 0 0 1.4l2.6 2.6a1 1 0 0 0 1.4 0l4.6-4.6a1 1 0 0 0 0-1.4z"/><path d="M19.686 8.314a12.501 12.501 0 0 1 1.356 10.225 1 1 0 0 1-1.751-.119 22 22 0 0 0-3.393-6.319"/></svg>',
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],
    content: [
      {
        text: [
          'Id: ',
          {
            text: `${data.id}`,
            link: `${pathFrontend}/app/home/works/view/one/${data.id}`,
            style: 'link',
          },
        ],
        style: 'subtitle',
      },

      {
        text: `Fecha del trabajo: ${DateFormatter.getSpanishDate(data.date)}`,
        style: 'subtitle',
      },

      // Información general
      { text: 'Resumen', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [['Valor a pagar', FormatMoneyValue(data.total)]],
        },
        margin: [0, 0, 0, 10],
        layout: 'noBorders',
      },
      {
        text: [
          'Descripción: ',
          {
            text: data.description || 'Ninguna',
          },
        ],
        style: 'subtitle',
      },

      { text: 'Información del cultivo', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            [
              'Id:',
              {
                text: data.crop.id,
                style: ['boldText', 'link'],
                link: `${pathFrontend}/app/home/crops/view/one/${data.crop.id}`,
              },
            ],
            ['Nombre:', { text: data.crop.name, style: 'boldText' }],
            [
              'Unidades:',
              {
                text: FormatNumber(data.crop.units),
                style: 'boldText',
              },
            ],
            ['Ubicación:', { text: data.crop.location, style: 'boldText' }],
            [
              'Fecha de creación:',
              { text: data.crop.date_of_creation, style: 'boldText' },
            ],
          ],
        },
        margin: [0, 0, 0, 10],
        layout: 'noBorders',
      },

      // Detalles de empleados
      { text: 'Detalles del trabajo', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Id Empleado', style: 'tableHeader' },
              { text: 'Empleado', style: 'tableHeader' },

              { text: 'Valor a pagar', style: 'tableHeader' },
              { text: 'Pendiente de pago', style: 'tableHeader' },
            ],
            ...data.details.map((detail) => [
              {
                text: detail.employee.id,
                link: `${pathFrontend}/app/home/employees/view/one/${detail.employee.id}`,
                style: ['tableCell', 'link'],
              },
              {
                text: `${detail.employee.first_name} ${detail.employee.last_name}`,
                style: 'tableCell',
              },

              {
                text: FormatMoneyValue(detail.value_pay),
                style: 'tableCell',
                alignment: 'center',
              },

              {
                text: detail.payment_is_pending ? 'Sí' : 'No',
                alignment: 'center',
                color: detail.payment_is_pending ? '#9e0059' : '#2a9d8f',
                style: ['tableCell'],
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
    defaultStyle: {
      font: 'Roboto',
    },
  };
};
