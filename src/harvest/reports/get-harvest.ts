import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { footerSection } from 'src/common/reports/sections/footer.section';
import { headerSection } from 'src/common/reports/sections/header.section';
import { Harvest } from '../entities/harvest.entity';
import { FormatNumber } from 'src/common/helpers/formatNumber';
import { FormatMoneyValue } from 'src/common/helpers/formatMoneyValue';

interface ReportOptions {
  title?: string;
  subTitle?: string;
  data: Harvest & { total_processed: number };
}

export const getHarvestReport = (
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
      { text: 'Reporte General', style: 'header' },
      { text: `Fecha del reporte: ${data.date}`, margin: [0, 0, 0, 10] },

      // Información general
      { text: 'Información General', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['ID', data.id],
            ['Total', FormatNumber(data.total) + ' Kg'],
            ['Valor a Pagar', FormatMoneyValue(data.value_pay)],
            ['Observaciones', data.observation || 'Ninguna'],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Información del cultivo
      { text: 'Información del Cultivo', style: 'subheader' },
      {
        table: {
          widths: ['auto', 'auto'],
          body: [
            ['Nombre', data.crop.name],
            ['Descripción', data.crop.description],
            ['Unidades', FormatNumber(data.crop.units)],
            ['Ubicación', data.crop.location],
            ['Fecha de Creación', data.crop.date_of_creation],
            ['Fecha de Terminación', data.crop.date_of_termination || 'N/A'],
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Detalles de empleados
      { text: 'Detalles de los Empleados', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              'Nombre',
              'Email',
              'Teléfono',
              'Total',
              'Valor a pagar',
              'Pendiente',
            ],
            ...data.details.map((detail) => [
              `${detail.employee.first_name} ${detail.employee.last_name}`,
              detail.employee.email,
              detail.employee.cell_phone_number,
              FormatNumber(detail.total),
              FormatMoneyValue(detail.value_pay),
              detail.payment_is_pending ? 'Sí' : 'No',
            ]),
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Procesos realizados

      { text: 'Procesos Realizados', style: 'subheader' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto'],
          body: [
            ['ID', 'Fecha', 'Total'],
            ...data.processed.map((proc) => [proc.id, proc.date, FormatNumber(proc.total)]),
          ],
        },
        margin: [0, 0, 0, 10],
      },

      // Resumen
      {
        text: `Total Procesado: ${FormatNumber(data.total_processed) + ' Kg'}`,
        style: 'summary',
      },
    ],
    styles: {
      header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
      summary: { fontSize: 14, italics: true, margin: [0, 10, 0, 0] },
    },
  };
};
