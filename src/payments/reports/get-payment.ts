import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';

import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';
import { FormatNumber } from 'src/common/helpers/formatNumber';
import { Payment } from '../entities/payment.entity';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Payment;
}

export const getPaymentReport = (
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
      { text: 'Reporte de pago', style: 'header' },
      { text: `Fecha del trabajo: ${data.date}`, margin: [0, 0, 0, 10] },

      // Información general
      { text: 'Información General', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['ID', data.id],
            ['Total', FormatMoneyValue(data.total)],
            ['Metodo de pago', data.method_of_payment],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Información del cultivo
      { text: 'Información del empleado', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['Nombre(s)', data.employee.first_name],
            ['Apellido(s)', data.employee.last_name],
            ['Correo', data.employee.email],
            ['Celular', data.employee.cell_phone_number],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Detalles de pagos - cosecha
      { text: 'Detalles de los pagos - Cosecha', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto'],
          body: [
            ['ID', 'Fecha', 'Total', 'Valor a pagar'],
            ...data.payments_harvest.map(({ harvests_detail }) => [
              harvests_detail.harvest.id,
              harvests_detail.harvest.date,
              FormatNumber(harvests_detail.total) + ' Kg',
              FormatMoneyValue(harvests_detail.value_pay),
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },
      // Detalles de pagos - trabajo
      { text: 'Detalles de los pagos - Trabajo', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto'],
          body: [
            ['ID', 'Fecha', 'Valor a pagar'],
            ...data.payments_work.map(({ works_detail }) => [
              works_detail.work.id,
              works_detail.work.date,
              FormatMoneyValue(works_detail.value_pay),
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
