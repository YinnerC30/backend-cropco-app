import { Body, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedDto, SeedControlledDto } from './dto/seed.dto';
import { DevelopmentGuard } from './guards/development.guard';
import { AuthAdministration } from 'src/auth/decorators/auth-administrator.decorator';

@Controller('seed')
@AuthAdministration()
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
  executeSeedControlled(@Body() seedDto: SeedControlledDto) {
    return this.seedService.runSeedControlled(seedDto);
  }

  /**
   * Permite limpiar la base de datos de forma controlada, especificando qué entidades eliminar.
   * @param clearOptions - Objeto con las opciones de limpieza por entidad.
   * @returns Un mensaje confirmando la limpieza exitosa.
   */
  @Get('clear')
  clearDatabaseControlled(
    @Query()
    clearOptions: {
      users?: boolean;
      clients?: boolean;
      supplies?: boolean;
      shoppingSupplies?: boolean;
      suppliers?: boolean;
      consumptionSupplies?: boolean;
      harvests?: boolean;
      works?: boolean;
      crops?: boolean;
      employees?: boolean;
      sales?: boolean;
      payments?: boolean;
    } = {},
  ) {
    return this.seedService.clearDatabaseControlled(clearOptions);
  }
}
