import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantDatabase } from './entities/tenant-database.entity';
import { TenantUser } from './entities/tenant-user.entity';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantDatabase)
    private tenantDatabaseRepository: Repository<TenantDatabase>,
    @InjectRepository(TenantUser)
    private tenantUserRepository: Repository<TenantUser>,
    private dataSource: DataSource,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    // Crear el tenant
    const tenant = this.tenantRepository.create(createTenantDto);
    await this.tenantRepository.save(tenant);

    // Crear la base de datos para el tenant
    const databaseName = `cropco_tenant_${tenant.id}`;
    await this.createTenantDatabase(tenant.id, databaseName);

    return tenant;
  }

  async findAll() {
    return this.tenantRepository.find();
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    const tenant = await this.findOne(id);
    Object.assign(tenant, updateTenantDto);
    return this.tenantRepository.save(tenant);
  }

  async remove(id: string) {
    const tenant = await this.findOne(id);
    return this.tenantRepository.softRemove(tenant);
  }

  private async createTenantDatabase(tenantId: string, databaseName: string) {
    // Crear la base de datos
    await this.dataSource.query(`CREATE DATABASE ${databaseName}`);

    // Guardar la configuración de la base de datos
    const tenantDatabase = this.tenantDatabaseRepository.create({
      tenantId,
      databaseName,
      connectionConfig: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
      },
    });

    await this.tenantDatabaseRepository.save(tenantDatabase);
  }

  async getTenantConnection(tenantId: string) {
    const tenantDatabase = await this.tenantDatabaseRepository.findOne({
      where: { tenantId, isActive: true },
    });

    if (!tenantDatabase) {
      throw new NotFoundException(`Database for tenant ${tenantId} not found`);
    }

    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: tenantDatabase.databaseName,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: process.env.STATUS_PROJECT === 'development',
    };
  }

  async addUserToTenant(tenantId: string, userId: string, role: string) {
    const tenantUser = this.tenantUserRepository.create({
      tenantId,
      userId,
      role,
    });

    return this.tenantUserRepository.save(tenantUser);
  }

  async getTenantUsers(tenantId: string) {
    return this.tenantUserRepository.find({
      where: { tenantId, isActive: true },
    });
  }
}
