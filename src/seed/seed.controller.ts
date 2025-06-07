import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedDto } from './dto/seed.dto';
import { DevelopmentGuard } from './guards/development.guard';

@Controller('seed')
@UseGuards(DevelopmentGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  executeSeed(@Query() seedDto: SeedDto) {
    return this.seedService.runSeedSelective(seedDto);
  }
}
