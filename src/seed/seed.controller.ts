import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedDto, SeedControlledDto } from './dto/seed.dto';
import { DevelopmentGuard } from './guards/development.guard';

@Controller('seed')
@UseGuards(DevelopmentGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Get()
  executeSeed(@Query() seedDto: SeedDto) {
    return this.seedService.runSeedSelective(seedDto);
  }

  /**
   * Permite ejecutar el seed controlado, especificando la cantidad de registros por entidad.
   * @param seedDto - Objeto con la cantidad de registros a crear por entidad.
   * @returns Un mensaje y el historial de registros insertados.
   */
  @Get('controlled')
  executeSeedControlled(@Query() seedDto: SeedControlledDto) {
    return this.seedService.runSeedControlled(seedDto);
  }
}
