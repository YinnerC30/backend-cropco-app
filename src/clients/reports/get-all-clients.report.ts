import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { ClientTable } from '../interfaces/Client';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  clients: ClientTable[];
}

export const getClientsReport = (
  options: ReportOptions,
): TDocumentDefinitions => {
  const { title, subTitle, clients } = options;

  return {
    pageOrientation: 'landscape',
    header: headerSection({
      title: title ?? 'Reporte de Clientes',
    }),
    footer: footerSection,
    pageMargins: [40, 110, 40, 60],
    content: [
      {
        layout: 'customLayout01', //'lightHorizontalLines', // optional
        table: {
          // headers are automatically repeated if the table spans over multiple pages
          // you can declare how many rows should be treated as headers
          headerRows: 1,
          widths: [50, 50, 50, '*', 'auto', '*'],

          body: [
            [
              'Id',
              'Nombre',
              'Apellido',
              'Email',
              'Número celular',
              'Dirección',
            ],
            ...clients.map((client: ClientTable, index: number) => [
              // client.id.toString(),
              index,
              client.first_name,
              client.last_name,
              { text: client.email, bold: true },
              client.cell_phone_number,
              client.address,
            ]),

            ['', '', '', '', '', ``],
            [
              '',
              '',
              '',
              '',
              'Total',
              {
                text: `${clients.length} clientes`,
                bold: true,
              },
            ],

            // [{ text: 'Bold value', bold: true }, 'Val 2', 'Val 3', 'Val 4'],
          ],
        },
      },

      // Tabla de totales
      {
        text: 'Totales',
        style: {
          fontSize: 18,
          bold: true,
          margin: [0, 40, 0, 0],
        },
      },
      {
        layout: 'noBorders',
        table: {
          headerRows: 1,
          widths: [50, 50, 70, '*', 'auto', '*'],
          body: [
            [
              {
                text: 'Total de países',
                colSpan: 2,
                bold: true,
              },
              {},
              {
                text: `${clients.length} clientes`,
                bold: true,
              },
              {},
              {},
              {},
            ],
          ],
        },
      },
    ],
  };
};
