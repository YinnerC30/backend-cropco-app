import { TDocumentDefinitions } from 'pdfmake/interfaces';

import { FormatMoneyValue } from 'src/common/helpers/money-formatter';
import { FormatNumber } from 'src/common/helpers/number-formatter';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { MyStyles } from 'src/common/reports/sections/styles-dictionary';
import { Harvest } from '../entities/harvest.entity';
import { DateFormatter } from 'src/common/helpers';

interface ReportOptions {
  data: Harvest & { total_processed: number };
}

export const getHarvestReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
  const { data } = options;

  const pathFrontend = process.env['HOST_FRONTED'] ?? 'http://localhost:5173';

  return {
    header: headerSection({
      title: 'Reporte de cosecha',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#606C38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tractor"><path d="m10 11 11 .9a1 1 0 0 1 .8 1.1l-.665 4.158a1 1 0 0 1-.988.842H20"/><path d="M16 18h-5"/><path d="M18 5a1 1 0 0 0-1 1v5.573"/><path d="M3 4h8.129a1 1 0 0 1 .99.863L13 11.246"/><path d="M4 11V4"/><path d="M7 15h.01"/><path d="M8 10.1V4"/><circle cx="18" cy="18" r="2"/><circle cx="7" cy="15" r="5"/></svg>',
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],
    content: [
      {
        text: [
          'Id: ',
          {
            text: `${data.id}`,
            link: `${pathFrontend}/app/home/harvests/view/one/${data.id}`,
            style: 'link',
          },
        ],
        style: 'subtitle',
      },

      {
        text: `Fecha de la cosecha: ${DateFormatter.getSpanishDate(data.date)}`,
        style: 'subtitle',
      },

      {
        text: [
          'Observaciones: ',
          {
            text: data.observation || 'Ninguna',
          },
        ],
        style: 'subtitle',
      },

      {
        columns: [
          // Columna 1: Resumen
          {
            width: '50%', // Ancho de la columna
            alignment: 'left',
            stack: [
              { text: 'Resumen', style: 'subheader' },
              {
                table: {
                  widths: ['auto', 'auto'],
                  body: [
                    [
                      'Total cosechado:',
                      {
                        text: FormatNumber(data.amount) + ' Kg',
                        style: 'boldText',
                      },
                    ],
                    [
                      'Total Stock procesado:',
                      {
                        text: FormatNumber(data.total_processed) + ' Kg',
                        style: 'boldText',
                      },
                    ],
                    [
                      'Valor a pagar:',
                      {
                        text: FormatMoneyValue(data.value_pay),
                        style: 'boldText',
                      },
                    ],
                  ],
                },
                margin: [0, 0, 0, 10],
                layout: 'noBorders',
              },
            ],
          },

          // Columna 2: Información del cultivo
          {
            width: '50%', // Ancho de la columna
            stack: [
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
                    [
                      'Ubicación:',
                      { text: data.crop.location, style: 'boldText' },
                    ],
                    [
                      'Fecha de creación:',
                      { text: data.crop.date_of_creation, style: 'boldText' },
                    ],
                  ],
                },
                margin: [0, 0, 0, 10],
                layout: 'noBorders',
              },
            ],
          },
        ],
        columnGap: 20, // Espacio entre las columnas
      },

      // Detalles de empleados
      { text: 'Detalles de la cosecha', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Id Empleado', style: 'tableHeader' },
              { text: 'Empleado', style: 'tableHeader' },
              { text: 'Total cosechado', style: 'tableHeader' },
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
                text: FormatNumber(detail.amount),
                style: 'tableCell',
                alignment: 'center',
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
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f9fafb' : null), // Fondo gris para el encabezado
        },
      },

      {
        text: [
          'Total cosechado: ',
          {
            text: `${FormatNumber(data.amount) + ' Kg'}`,
            style: 'boldText',
          },
          '\nTotal a pagar: ',
          {
            text: `${FormatMoneyValue(data.value_pay)}`,
            style: 'boldText',
          },
        ],
      },

      // Procesos realizados
      { text: 'Información sobre cosecha procesada', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Id', style: 'tableHeader' },
              { text: 'Fecha', style: 'tableHeader' },
              { text: 'Total', style: 'tableHeader' },
            ],
            ...data.processed.map((proc) => [
              {
                text: proc.id,
                link: `${pathFrontend}/app/home/harvests/processed/view/${data.id}`,
                style: ['tableCell', 'link'],
              },
              {
                text: DateFormatter.getSpanishDate(proc.date),
                style: 'tableCell',
              },
              {
                text: FormatNumber(proc.amount),
                style: 'tableCell',
                alignment: 'center',
              },
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
        // layout: {
        //   fillColor: (rowIndex: number) => (rowIndex === 0 ? '#f9fafb' : null), // Fondo gris para el encabezado
        // },
      },

      // Resumen final
      {
        text: [
          'Total de Stock procesado: ',
          {
            text: `${FormatNumber(data.total_processed) + ' Kg'}`,
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
