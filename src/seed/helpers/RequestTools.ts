import { INestApplication } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { SeedControlledDto } from '../dto/seed.dto';
import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantConnectionService } from 'src/tenants/services/tenant-connection.service';
import { DataSource } from 'typeorm';
import { CreateTenantDto } from 'src/tenants/dto/create-tenant.dto';
import { Administrator } from 'src/administrators/entities/administrator.entity';

/**
 * Utility class for making HTTP requests related to user and permission management in tests.
 */
export class RequestTools {
  private moduleFixture: TestingModule;
  private tenantRepository: Repository<Tenant>;
  private tenantConnectionService: TenantConnectionService;
  private administratorRepository: Repository<Administrator>;
  private app: INestApplication | null = null;
  private tenantId: string | null = null;
  private user: User | null = null;

  /**
   * Creates an instance of RequestTools.
   * @param params - Object containing the moduleFixture.
   */
  constructor(params: { moduleFixture: TestingModule }) {
    this.moduleFixture = params.moduleFixture;
    this.tenantRepository = this.moduleFixture.get<Repository<Tenant>>(
      getRepositoryToken(Tenant),
    );
    this.administratorRepository = this.moduleFixture.get<
      Repository<Administrator>
    >(getRepositoryToken(Administrator));

    this.tenantConnectionService =
      this.moduleFixture.get<TenantConnectionService>(TenantConnectionService);
  }

  /**
   * Sets the NestJS application instance.
   * @param app - The NestJS application instance.
   */
  public setApp(app: INestApplication): void {
    this.app = app;
  }

  /**
   * Gets the current app. Throws an error if not set.
   * @returns The current app.
   */
  private getApp(): INestApplication {
    if (!this.app) {
      throw new Error('App has not been set. Call setApp(app) first.');
    }
    return this.app;
  }

  /**
   * Creates a default administrator user in the database.
   * @returns Promise<void>
   */
  public async createDefaultAdministrator(): Promise<Administrator> {
    const administratorData = {
      first_name: 'User',
      last_name: 'To Testing',
      email: 'usertotesting@mail.com',
      cell_phone_number: '3243347549',
      id: '503d8c7c-58c6-4330-840b-289107e13064',
      password: '$2b$10$Ko.8QGXNmo7eUP6z4CyZYObxLrau1B7m3uZshGNSe9bshyinUXigC',
      role: 'admin',
      is_active: true,
      createdAt: new Date('2025-06-29 02:06:44.711968'),
      updatedAt: new Date('2025-06-29 02:06:44.711968'),
      deletedAt: null,
    };

    const existingAdministrator = await this.administratorRepository.findOne({
      where: { id: administratorData.id },
    });
    if (!existingAdministrator) {
      const user = await this.administratorRepository.save(administratorData);
      return user;
    }
    return existingAdministrator;
  }

  /**
   * Initializes the tenantId by searching for the tenant by subdomain.
   * @param subdomain - The subdomain of the tenant.
   */
  public async initializeTenant(): Promise<void> {
    const user = await this.createDefaultAdministrator();

    const loginResponse = await request
      .default(this.getApp().getHttpServer())
      .post('/auth/management/login')
      .send({
        email: user.email,
        password: '123456',
      });

    if (loginResponse.status !== 201) {
      throw new Error(
        `Failed to login administrator: ${loginResponse.body.message}`,
      );
    }

    // Buscar si existe el tenant
    const setCookieHeader = loginResponse.headers['set-cookie'];
    const token = Array.isArray(setCookieHeader)
      ? setCookieHeader
          .find((cookie: string) => cookie.startsWith('administrator-token='))
          ?.split(';')[0]
          ?.split('=')[1]
      : undefined;

    const tenant = await this.tenantRepository.findOne({
      where: { subdomain: 'tenanttesting' },
    });
    if (!tenant) {
      console.log('Intento crear');
      const bodyRequest: CreateTenantDto = {
        subdomain: 'tenanttesting',
        company_name: 'tenant to testing',
        email: 'tenanttotesting@mail.com',
        cell_phone_number: '3122342134',
      };

      const responseTenantCreation = await request
        .default(this.getApp().getHttpServer())
        .post('/tenants/create')
        .set('Cookie', `administrator-token=${token}`)
        .send(bodyRequest);
      const responseTenantDBCreation = await request
        .default(this.getApp().getHttpServer())
        .post(`/tenants/create/database/${responseTenantCreation.body.id}`)
        .set('Cookie', `administrator-token=${token}`);
      const responseTenantDBConfig = await request
        .default(this.getApp().getHttpServer())
        .put(`/tenants/config-db/one/${responseTenantCreation.body.id}`)
        .set('Cookie', `administrator-token=${token}`);
      console.log('response de creación', responseTenantCreation.body.id);
      this.tenantId = responseTenantCreation.body.id;
      return;
    }

    this.tenantId = tenant.id;
  }

  /**
   * Gets the current user. Throws an error if the user is not set.
   * @returns The current user.
   */
  private getUser(): User {
    if (!this.user) {
      throw new Error('User has not been created or set.');
    }
    return this.user;
  }

  /**
   * Gets the current tenantId. Throws an error if not initialized.
   * @returns The current tenantId.
   */
  private getTenantId(): string {
    if (!this.tenantId) {
      throw new Error(
        'TenantId has not been initialized. Call initializeTenant first.',
      );
    }
    return this.tenantId;
  }

  /**
   * Creates a new test user using the seed controlled endpoint.
   * Throws an error if a user already exists.
   * @returns The created user.
   */
  public async createTestUser(): Promise<User> {
    if (this.user) {
      throw new Error('A user has already been created.');
    }
    const { body } = await request
      .default(this.getApp().getHttpServer())
      .get('/seed/controlled')
      .set('x-tenant-id', this.getTenantId())
      .query({ users: 1 });
    this.user = body.history.insertedUsers[0];
    return this.user;
  }

  /**
   * Creates a new user using the seed controlled endpoint.
   * Throws an error if a user already exists.
   * @returns The created user.
   */
  public async createSeedData(seedDto: SeedControlledDto): Promise<any> {
    const { body } = await request
      .default(this.getApp().getHttpServer())
      .get('/seed/controlled')
      .set('x-tenant-id', this.getTenantId())
      .query(seedDto);
    return body;
  }

  /**
   * Clears the database in a controlled manner using the clear endpoint.
   * @param clearOptions - Object with clearing options for each entity.
   * @returns A promise that resolves when the database is cleared.
   */
  public async clearDatabaseControlled(
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
    } = {},
  ): Promise<void> {
    await request
      .default(this.getApp().getHttpServer())
      .get('/seed/clear')
      .set('x-tenant-id', this.getTenantId())
      .query(clearOptions)
      .expect(200);
  }

  /**
   * Deletes a test user by user ID using the corresponding endpoint.
   * @returns A promise that resolves when the user is deleted.
   */
  public async deleteTestUser(): Promise<void> {
    const user = this.getUser();
    await request
      .default(this.getApp().getHttpServer())
      .post(`/auth/delete-test-user/${user.id}`)
      .set('x-tenant-id', this.getTenantId())
      .expect(201);
  }

  /**
   * Generates a JWT token for a user by logging in.
   * @returns The JWT token as a string.
   */
  public async generateTokenUser(): Promise<string> {
    const user = this.getUser();
    const response = await request
      .default(this.getApp().getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', this.getTenantId())
      .send({
        email: user.email,
        password: '123456',
      });

    return response.headers['set-cookie'][0]
      .split(';')[0]
      .replace('user-token=', '');
  }

  /**
   * Generates a JWT token for a user by logging in.
   * @returns The JWT token as a string.
   */
  public async generateTokenForUser(user: User): Promise<string> {
    const response = await request
      .default(this.getApp().getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', this.getTenantId())
      .send({
        email: user.email,
        password: '123456',
      });

    return response.headers['set-cookie'][0]
      .split(';')[0]
      .replace('user-token=', '');
  }

  /**
   * Adds an action/permission to a user.
   * @param actionName - The name of the action/permission to add.
   */
  public async addActionToUser(actionName: string): Promise<void> {
    const user = this.getUser();
    await request
      .default(this.getApp().getHttpServer())
      .post(`/auth/add-permission/${user.id}/${actionName}`)
      .set('x-tenant-id', this.getTenantId())
      .expect(201);
  }

  /**
   * Removes all permissions from a user for a specific module.
   * @param userId - The identifier of the user.
   * @param moduleName - The name of the module.
   */
  public async removePermissionsToModule(
    userId: string,
    moduleName: string,
  ): Promise<void> {
    await request
      .default(this.getApp().getHttpServer())
      .post(`/auth/remove-permissions-to-module/${userId}/${moduleName}`)
      .set('x-tenant-id', this.getTenantId())
      .expect(201);
  }

  /**
   * Adds an action/permission to a user.
   * @param actionName - The name of the action/permission to add.
   */
  public async addActionForUser(
    userId: string,
    actionName: string,
  ): Promise<void> {
    const user = this.getUser();
    await request
      .default(this.getApp().getHttpServer())
      .post(`/auth/add-permission/${userId}/${actionName}`)
      .set('x-tenant-id', this.getTenantId())
      .expect(201);
  }

  /**
   * Removes a specific permission from a user.
   * @param userId - The identifier of the user.
   * @param actionName - The name of the action/permission to remove.
   */
  public async removePermissionFromUser(
    userId: string,
    actionName: string,
  ): Promise<void> {
    console.log(userId, actionName)
    const result = await request
      .default(this.getApp().getHttpServer())
      .post(`/auth/remove-permission/${userId}/${actionName}`)
      .set('x-tenant-id', this.getTenantId())
      .expect(201);
      console.log(result.body, result.status)
  }

  /**
   * Obtiene la conexión actual del tenant.
   * @returns La conexión DataSource del tenant actual.
   */
  public async getCurrentTenantConnection(): Promise<DataSource> {
    const tenantId = this.getTenantId();
    const connection =
      await this.tenantConnectionService.getTenantConnection(tenantId);
    console.log('Se obtuvo el datasource');
    return connection;
  }

  /**
   * Obtiene el repositorio de una entidad específica usando la conexión del tenant actual.
   * @param entity - La clase de la entidad para la cual obtener el repositorio.
   * @returns El repositorio de la entidad especificada.
   */
  public async getRepository<T>(entity: new () => T): Promise<Repository<T>> {
    const connection = await this.getCurrentTenantConnection();
    return connection.getRepository(entity);
  }

  /**
   * Método público para exponer el tenantId actual.
   * @returns El tenantId actual.
   */
  public getTenantIdPublic(): string {
    return this.getTenantId();
  }
}
