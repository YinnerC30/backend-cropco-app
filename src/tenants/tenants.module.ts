import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantDatabase } from './entities/tenant-database.entity';
import { TenantUser } from './entities/tenant-user.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantConnectionService } from './services/tenant-connection.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantDatabase, TenantUser])],
  controllers: [TenantsController],
  providers: [TenantsService, TenantConnectionService],
  exports: [TenantsService, TenantConnectionService],
})
export class TenantsModule {}
