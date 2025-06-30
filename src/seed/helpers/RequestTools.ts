import { INestApplication } from '@nestjs/common';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';

/**
 * Utility class for making HTTP requests related to user and permission management in tests.
 */
export class RequestTools {
  private readonly app: INestApplication;
  private readonly tenantId: string;
  private user: User;

  /**
   * Creates an instance of RequestTools.
   * @param params - Object containing the NestJS application instance and tenant identifier.
   */
  constructor(params: { app: INestApplication; tenantId: string }) {
    this.app = params.app;
    this.tenantId = params.tenantId;
  }

  /**
   * Creates a new user using the seed controlled endpoint.
   * @returns The created user.
   */
  public async createUser(): Promise<User> {
    const { body } = await request
      .default(this.app.getHttpServer())
      .get('/seed/controlled')
      .set('x-tenant-id', this.tenantId)
      .query({ users: 1 });
    this.user = body.history.insertedUsers[0];
    return this.user;
  }

  /**
   * Deletes a test user by user ID using the corresponding endpoint.
   * @param userId - The identifier of the user to delete.
   * @returns A promise that resolves when the user is deleted.
   */
  public async deleteTestUser(): Promise<void> {
    await request
      .default(this.app.getHttpServer())
      .post(`/auth/delete-test-user/${this.user.id}`)
      .set('x-tenant-id', this.tenantId)
      .expect(201);
  }

  /**
   * Generates a JWT token for a user by logging in.
   * @param user - The user entity.
   * @returns The JWT token as a string.
   */
  public async generateTokenUser(): Promise<string> {
    const response = await request
      .default(this.app.getHttpServer())
      .post('/auth/login')
      .set('x-tenant-id', this.tenantId)
      .send({
        email: this.user.email,
        password: '123456',
      });

    return response.headers['set-cookie'][0]
      .split(';')[0]
      .replace('user-token=', '');
  }

  /**
   * Adds an action/permission to a user.
   * @param user - The user entity.
   * @param actionName - The name of the action/permission to add.
   */
  public async addActionToUser(actionName: string): Promise<void> {
    await request
      .default(this.app.getHttpServer())
      .post(`/auth/add-permission/${this.user.id}/${actionName}`)
      .set('x-tenant-id', this.tenantId)
      .expect(201);
  }
}
