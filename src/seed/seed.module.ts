import { Module } from '@nestjs/common';

import { UsersModule } from './../users/users.module';

import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { CropsModule } from 'src/crops/crops.module';

@Module({
  controllers: [SeedController],
  providers: [SeedService],
  imports: [UsersModule, CropsModule],
})
export class SeedModule {}
