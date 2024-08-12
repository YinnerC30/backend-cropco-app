import { Controller, Get, Res } from '@nestjs/common';
import { PrinterService } from './printer.service';
import { Response } from 'express';

@Controller('printer')
export class PrinterController {
  constructor(private printerService: PrinterService) {}
  @Get('test')
  async hello(@Res() response: Response) {
    const pdfDoc = this.printerService.test();
    response.setHeader('Content-Type', 'application/pdf');
    pdfDoc.info.Title = 'Hola-Mundo';
    pdfDoc.pipe(response);
    pdfDoc.end();
  }
}
