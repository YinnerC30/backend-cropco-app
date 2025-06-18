import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantDatabase } from './entities/tenant-database.entity';
import { TenantAdministrator } from './entities/tenant-administrator.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantConnectionService } from './services/tenant-connection.service';
import { CommonModule } from 'src/common/common.module';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, TenantDatabase, TenantAdministrator]),
    CommonModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService, TenantConnectionService],
  exports: [TenantsService, TenantConnectionService,TypeOrmModule],
})
export class TenantsModule {}
