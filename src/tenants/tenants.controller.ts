import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';
import { TenantConnectionService } from './services/tenant-connection.service';

@Controller('tenants')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly tenantsConnectionService: TenantConnectionService,
  ) {}

  @Post()
  // @Roles('admin')
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  // @Roles('admin')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  // @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get('connection-db/:id')
  // @Roles('admin')
  findOneConnectionDB(@Param('id') id: string) {
    return this.tenantsService.getOneTenantConfigDB(id);
  }

  @Put('config-db/:id')
  configDataBaseTanent(@Param('id') id: string) {
    return this.tenantsService.configDataBaseTenant(id);
  }

  @Patch(':id')
  // @Roles('admin')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  // @Roles('admin')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  // @Get(':id/users')
  // // @Roles('admin')
  // getTenantUsers(@Param('id') id: string) {
  //   return this.tenantsService.getTenantUsers(id);
  // }

  // @Post(':id/users')
  // // @Roles('admin')
  // addUserToTenant(
  //   @Param('id') id: string,
  //   @Body() body: { userId: string; role: string },
  // ) {
  //   return this.tenantsService.addUserToTenant(id, body.userId, body.role);
  // }
}
