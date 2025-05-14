// https://fonts.google.com/selection
import { Injectable } from '@nestjs/common';
import PdfPrinter from 'pdfmake';
import {
  BufferOptions,
  CustomTableLayout,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

const fonts = {
  Roboto: {
    normal: 'public/fonts/Roboto-Regular.ttf',
    bold: 'public/fonts/Roboto-Medium.ttf',
    italics: 'public/fonts/Roboto-Italic.ttf',
    bolditalics: 'public/fonts/Roboto-MediumItalic.ttf',
  },
};

const customTableLayouts: Record<string, CustomTableLayout> = {
  customLayout01: {
    hLineWidth: function (i, node) {
      if (i === 0 || i === node.table.body.length) {
        return 0;
      }
      return i === node.table.headerRows ? 2 : 1;
    },
    vLineWidth: function () {
      return 0;
    },
    hLineColor: function (i) {
      return i === 1 ? 'black' : '#bbbbbb';
    },
    paddingLeft: function (i) {
      return i === 0 ? 0 : 8;
    },
    paddingRight: function (i, node) {
      return i === node.table.widths.length - 1 ? 0 : 8;
    },
    fillColor: function (i, node) {
      if (i === 0) {
        return '#7b90be';
      }
      if (i === node.table.body.length - 1) {
        return '#acb3c1';
      }

      return i % 2 === 0 ? '#f3f3f3' : null;
    },
  },
  borderBlue: {
    hLineColor: function () {
      return '#5f96d4';
    },
    vLineColor: function () {
      return '#5f96d4';
    },
  },
};

interface CreatePdfProps {
  title?: string;
  docDefinition: TDocumentDefinitions;
  options?: {
    tableLayouts: Record<string, CustomTableLayout>;
  };
}

@Injectable()
export class PrinterService {
  private printer = new PdfPrinter(fonts);

  createPdf({
    title = '',
    docDefinition,
    options = { tableLayouts: customTableLayouts },
  }: CreatePdfProps): PDFKit.PDFDocument {
    const document = this.printer.createPdfKitDocument(docDefinition, options);
    document.info.Title = title;
    return document;
  }
}
