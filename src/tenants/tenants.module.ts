import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from 'src/common/common.module';
import { TenantDatabase } from './entities/tenant-database.entity';
import { Tenant } from './entities/tenant.entity';
import { TenantConnectionService } from './services/tenant-connection.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantDatabase]), CommonModule],
  controllers: [TenantsController],
  providers: [TenantsService, TenantConnectionService],
  exports: [TenantsService, TenantConnectionService, TypeOrmModule],
})
export class TenantsModule {}
