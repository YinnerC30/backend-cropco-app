import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SeedService } from './seed.service';
import { SeedDto, SeedControlledDto } from './dto/seed.dto';
import { DevelopmentGuard } from './guards/development.guard';
import { AuthAdministration } from 'src/auth/decorators/auth-administrator.decorator';

@Controller('seed')
@AuthAdministration()
@UseGuards(DevelopmentGuard)
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  // @Get()
  // @Throttle({ default: { ttl: 300000, limit: 3 } })
  // executeSeed(@Query() seedDto: SeedDto) {
  //   return this.seedService.runSeedSelective(seedDto);
  // }

  /**
   * Permite ejecutar el seed controlado, especificando la cantidad de registros por entidad.
   * @param seedDto - Objeto con la cantidad de registros a crear por entidad.
   * @returns Un mensaje y el historial de registros insertados.
   */
  @Post('controlled')
  @Throttle({ default: { ttl: 300000, limit: 3 } })
  executeSeedControlled(@Body() seedDto: SeedControlledDto) {
    return this.seedService.runSeedControlled(seedDto);
  }

  /**
   * Permite limpiar la base de datos de forma controlada, especificando qué entidades eliminar.
   * @param clearOptions - Objeto con las opciones de limpieza por entidad.
   * @returns Un mensaje confirmando la limpieza exitosa.
   */
  @Delete('clear')
  @Throttle({ default: { ttl: 300000, limit: 3 } })
  clearDatabaseControlled(
    @Body()
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
