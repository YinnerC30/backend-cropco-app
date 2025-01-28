import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { Work } from '../entities/work.entity';
import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';
import { FormatNumber } from 'src/common/helpers/formatNumber';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { formatDate } from 'src/common/helpers/formatDate';

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
        text: `Fecha del trabajo: ${formatDate(data.date)}`,
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
