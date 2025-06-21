import { Module } from '@nestjs/common';
import { AdministratorsService } from './administrators.service';
import { AdministratorsController } from './administrators.controller';

@Module({
  controllers: [AdministratorsController],
  providers: [AdministratorsService],
})
export class AdministratorsModule {}
