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
    defaultStyle: {
      fontSize: 9
    },
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
          widths: [120, 50, 50, '*', 'auto', 100],

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
              client.id.toString(),
              // index,
              client.first_name,
              client.last_name,
              { text: client.email, bold: true },
              client.cell_phone_number,
              client.address,
            ]),

            ['', '', '', '', '', ''],
            // [
            //   '',
            //   '',
            //   '',
            //   '',
            //   'Total',
            //   {
            //     text: `${clients.length} clientes`,
            //     bold: true,
            //   },
            // ],
          ],
        },
      },
    ],
  };
};
