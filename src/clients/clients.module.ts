import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { DatabaseModule } from 'src/database/database.module';
import { clientProviders } from './clients.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [ClientsController],
  providers: [...clientProviders, ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
