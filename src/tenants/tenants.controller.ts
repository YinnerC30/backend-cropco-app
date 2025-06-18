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
import { TenantAdministradorDto } from './dto/tenant-administrator.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantConnectionService } from './services/tenant-connection.service';
import { TenantsService } from './tenants.service';
import { AuthTenant } from 'src/auth/decorators/auth-tenant.decorator';

@AuthTenant()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post('create')
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Post('create/admin')
  createAdmin(@Body() tenantAdministradorDto: TenantAdministradorDto) {
    return this.tenantsService.createAdmin(tenantAdministradorDto);
  }

  @Get('all')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('all/admin')
  findAllAdmin() {
    return this.tenantsService.findAllAdmin();
  }

  @Get('one/:id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get('one/admin/:id')
  findOneAdmin(@Param('id') id: string) {
    return this.tenantsService.findOneAdmin(id);
  }

  @Get('one/find/:TenantSubdomain')
  findOneBySubdomain(@Param('TenantSubdomain') subdomain: string) {
    return this.tenantsService.findOneBySubdomain(subdomain);
  }

  // @Get('one/connection-db/:id')
  // findOneConnectionDB(@Param('id') id: string) {
  //   return this.tenantsService.getOneTenantConfigDB(id);
  // }

  @Put('config-db/one/:id')
  configDataBaseTanent(@Param('id') id: string) {
    return this.tenantsService.configDataBaseTenant(id);
  }

  @Patch('update/one/:id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete('remove/one/:id')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Delete('remove/one/admin/:id')
  removeAdmin(@Param('id') id: string) {
    return this.tenantsService.removeAdmin(id);
  }

  // @Get(':id/users')
  // getTenantUsers(@Param('id') id: string) {
  //   return this.tenantsService.getTenantUsers(id);
  // }

  // @Post(':id/users')
  // addUserToTenant(
  //   @Param('id') id: string,
  //   @Body() body: { userId: string; role: string },
  // ) {
  //   return this.tenantsService.addUserToTenant(id, body.userId, body.role);
  // }
}
