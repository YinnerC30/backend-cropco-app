import { StyleDictionary } from 'pdfmake/interfaces';

export const MyStyles: StyleDictionary = {
  header: {
    fontSize: 25,
    bold: true,
    margin: [0, 0, 0, 10],
    color: '#606C38', // Color verde
    alignment: 'center',
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 1.2,
  },
  subheader: {
    fontSize: 16,
    bold: true,
    margin: [0, 10, 0, 5],
    color: '#606C38',
    // decoration: 'underline',
    lineHeight: 1.2,
  },
  summary: {
    fontSize: 12,
    margin: [0, 10, 0, 0],
    color: '#1f2937',
  },
  boldText: {
    fontSize: 12,
    bold: true,
    color: '#283618',
  },
  mutedText: {
    fontSize: 12,
    color: '#6b7280',
  },
  tableHeader: {
    alignment: 'center',
    fontSize: 12,
    bold: true,
    color: '#1f2937',
    fillColor: '#FEFAE0',
  },
  tableCell: {
    fontSize: 12,
    color: '#1f2937',
  },
  link: {
    fontSize: 12,
    decoration: 'underline',
    color: '#415a77',
    lineHeight: 1.2,
  },
};
