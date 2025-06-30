import { INestApplication } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { SeedControlledDto } from '../dto/seed.dto';

/**
 * Utility class for making HTTP requests related to user and permission management in tests.
 */
export class RequestTools {
  private readonly app: INestApplication;
  private readonly tenantId: string;
  private user: User | null = null;

  /**
   * Creates an instance of RequestTools.
   * @param params - Object containing the NestJS application instance and tenant identifier.
   */
  constructor(params: { app: INestApplication; tenantId: string }) {
    this.app = params.app;
    this.tenantId = params.tenantId;
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
   * Creates a new test user using the seed controlled endpoint.
   * Throws an error if a user already exists.
   * @returns The created user.
   */
  public async createTestUser(): Promise<User> {
    if (this.user) {
      throw new Error('A user has already been created.');
    }
    const { body } = await request
      .default(this.app.getHttpServer())
      .get('/seed/controlled')
      .set('x-tenant-id', this.tenantId)
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
      .default(this.app.getHttpServer())
      .get('/seed/controlled')
      .set('x-tenant-id', this.tenantId)
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
      .default(this.app.getHttpServer())
      .post(`/auth/delete-test-user/${user.id}`)
      .set('x-tenant-id', this.tenantId)
      .expect(201);
  }

  /**
   * Generates a JWT token for a user by logging in.
   * @returns The JWT token as a string.
   */
  public async generateTokenUser(): Promise<string> {
    const user = this.getUser();
    const response = await request
      .default(this.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', this.tenantId)
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
      .default(this.app.getHttpServer())
      .post(`/auth/add-permission/${user.id}/${actionName}`)
      .set('x-tenant-id', this.tenantId)
      .expect(201);
  }
}
