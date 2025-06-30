import { INestApplication } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { SeedControlledDto } from '../dto/seed.dto';
import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

/**
 * Utility class for making HTTP requests related to user and permission management in tests.
 */
export class RequestTools {
  private moduleFixture: TestingModule;
  private tenantRepository: Repository<Tenant>;
  private app: INestApplication | null = null;
  private tenantId: string | null = null;
  private user: User | null = null;

  /**
   * Creates an instance of RequestTools.
   * @param params - Object containing the moduleFixture.
   */
  constructor(params: { moduleFixture: TestingModule }) {
    this.moduleFixture = params.moduleFixture;
    this.tenantRepository = this.moduleFixture.get<Repository<Tenant>>(getRepositoryToken(Tenant));
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
   * Initializes the tenantId by searching for the tenant by subdomain.
   * @param subdomain - The subdomain of the tenant.
   */
  public async initializeTenant(subdomain: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ where: { subdomain } });
    if (!tenant) {
      throw new Error(`Tenant with subdomain: ${subdomain} not found.`);
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
      throw new Error('TenantId has not been initialized. Call initializeTenant first.');
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
   * Método público para exponer el tenantId actual.
   * @returns El tenantId actual.
   */
  public getTenantIdPublic(): string {
    return this.getTenantId();
  }
}
