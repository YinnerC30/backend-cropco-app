import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CropsModule } from './crops/crops.module';

@Module({
  imports: [UsersModule, DatabaseModule, ConfigModule.forRoot(), CropsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
