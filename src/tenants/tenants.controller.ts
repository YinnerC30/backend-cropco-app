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

  @Post('create')
  // @Roles('admin')
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get('all')
  // @Roles('admin')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('one/:id')
  // @Roles('admin')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
  @Get('one/find/:TenantSubdomain')
  // @Roles('admin')
  findOneBySubdomain(@Param('TenantSubdomain') subdomain: string) {
    return this.tenantsService.findOneBySubdomain(subdomain);
  }

  // @Get('one/connection-db/:id')
  // // @Roles('admin')
  // findOneConnectionDB(@Param('id') id: string) {
  //   return this.tenantsService.getOneTenantConfigDB(id);
  // }

  @Put('config-db/one/:id')
  configDataBaseTanent(@Param('id') id: string) {
    return this.tenantsService.configDataBaseTenant(id);
  }

  @Patch('update/one/:id')
  // @Roles('admin')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete('remove/one/:id')
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
