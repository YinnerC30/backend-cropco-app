import { Global, Module } from '@nestjs/common';
import { PrinterService } from './printer.service';
@Global()
@Module({
  providers: [PrinterService],
  exports: [PrinterService],
})
export class PrinterModule {}
