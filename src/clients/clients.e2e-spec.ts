import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import cookieParser from 'cookie-parser';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TestAppModule } from 'src/testing/testing-e2e.module';
import { User } from 'src/users/entities/user.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { Client } from './entities/client.entity';

describe('ClientsController (e2e)', () => {
  let app: INestApplication;
  let userTest: User;
  let token: string;
  let reqTools: RequestTools;
  let tenantId: string;

  let clientDtoTemplete: CreateClientDto = {
    first_name: InformationGenerator.generateFirstName(),
    last_name: InformationGenerator.generateLastName(),
    email: InformationGenerator.generateEmail(),
    cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
    address: InformationGenerator.generateAddress(),
  };

  let falseClientId = InformationGenerator.generateRandomId();

  const CreateClient = async () => {
    const client = (await reqTools.createSeedData({ clients: 1 })).history
      .insertedClients[0];

    const clientMapper = {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      cell_phone_number: client.cell_phone_number,
      address: client.address,
    };
    return clientMapper;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();

    reqTools = new RequestTools({ moduleFixture });
    reqTools.setApp(app);
    await reqTools.initializeTenant();
    tenantId = reqTools.getTenantIdPublic();

    await reqTools.clearDatabaseControlled({ clients: true });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('clients/all (GET)', () => {
    beforeAll(async () => {
      try {
        await reqTools.clearDatabaseControlled({ clients: true });

        await Promise.all(Array.from({ length: 17 }).map(() => CreateClient()));
        await reqTools.addActionToUser('find_all_clients');
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /clients/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 clients for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });
    it('should return all available records by sending the parameter all_records to true, ignoring other parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of clients passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of clients passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });

    it('should return the specified number of clients passed by the query', async () => {
      const client = await CreateClient();

      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/all`)
        .query({ query: client.first_name })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toBeGreaterThan(0);
      expect(response.body.current_row_count).toBeGreaterThan(0);
      expect(response.body.total_page_count).toBeGreaterThan(0);
      expect(response.body.current_page_count).toBeGreaterThan(0);

      response.body.records.forEach((client: Client) => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('first_name');
        expect(client).toHaveProperty('last_name');
        expect(client).toHaveProperty('email');
        expect(client).toHaveProperty('cell_phone_number');
        expect(client).toHaveProperty('address');
        expect(client).toHaveProperty('createdDate');
        expect(client).toHaveProperty('updatedDate');
        expect(client).toHaveProperty('deletedDate');
        expect(client.deletedDate).toBeNull();
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no client records with the requested pagination',
      );
    });
  });

  describe('clients/create (POST)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('create_client');
    });

    it('should throw an exception for not sending a JWT to the protected path /clients/create', async () => {
      const bodyRequest: CreateClientDto = {
        ...clientDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .send(bodyRequest)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new client', async () => {
      const bodyRequest: CreateClientDto = {
        ...clientDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);
      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'first_name must be shorter than or equal to 100 characters',
        'first_name must be a string',
        'last_name must be shorter than or equal to 100 characters',
        'last_name must be a string',
        'email must be shorter than or equal to 100 characters',
        'email must be an email',
        'email must be a string',
        'cell_phone_number must be shorter than or equal to 15 characters',
        'cell_phone_number must be longer than or equal to 9 characters',
        'cell_phone_number must be a number string',
        'address must be shorter than or equal to 200 characters',
        'address must be a string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a client with duplicate email.', async () => {
      const clientWithInitialEmail = await CreateClient();

      const bodyRequest: CreateClientDto = {
        ...clientDtoTemplete,
        email: clientWithInitialEmail.email,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${clientWithInitialEmail.email}) already exists.`,
      );
    });
  });

  describe('clients/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('find_one_client');
    });

    it('should throw an exception for not sending a JWT to the protected path clients/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one client', async () => {
      const { id } = await CreateClient();
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('sales_detail');
      expect(response.body.sales_detail).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('createdDate');
      expect(response.body).toHaveProperty('updatedDate');
      expect(response.body).toHaveProperty('deletedDate');
      expect(response.body.deletedDate).toBeNull();
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/1234`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding client by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Client with id: ${falseClientId} not found`,
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/clients/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('clients/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('update_one_client');
    });

    it('should throw an exception for not sending a JWT to the protected path clients/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one client', async () => {
      const { id } = await CreateClient();
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ first_name: 'John 4', last_name: 'Doe 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
      expect(body.last_name).toEqual('Doe 4');
    });

    it('should throw exception for not finding client to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ first_name: 'John 4' })
        .expect(404);
      expect(body.message).toEqual(
        `Client with id: ${falseClientId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the email for one that is in use.', async () => {
      const clientWithInitialEmail = await CreateClient();
      const { id } = await CreateClient();
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ email: clientWithInitialEmail.email })
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${clientWithInitialEmail.email}) already exists.`,
      );
    });
  });

  describe('clients/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_one_client');
    });

    it('should throw an exception for not sending a JWT to the protected path clients/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one client', async () => {
      const { id } = await CreateClient();

      await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const client = await clientRepository.findOne({ where: { id } });
      // expect(client).toBeNull();
    });

    it('You should throw exception for trying to delete a client that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Client with id: ${falseClientId} not found`,
      );
    });

    it('should throw an exception when trying to delete a client with sales pending payment.', async () => {
      const result = await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });

      const client = result.history.insertedSales[0].client;

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${client.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The client ${client.first_name} ${client.last_name} has sales receivables`,
      );
    });
  });

  describe('clients/export/all/pdf (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('export_clients_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path clients/export/all/pdf', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should export all clients in PDF format', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('clients/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_bulk_clients');
    });
    it('should throw an exception for not sending a JWT to the protected path clients/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete clients bulk', async () => {
      const [client1, client2, client3] = await Promise.all([
        await CreateClient(),
        await CreateClient(),
        await CreateClient(),
      ]);

      const bulkData: RemoveBulkRecordsDto<Client> = {
        recordsIds: [{ id: client1.id }, { id: client2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bulkData)
        .expect(200);

      // const [deletedClient1, deletedClient2, remainingClient3] =
      //   await Promise.all([
      //     clientRepository.findOne({ where: { id: client1.id } }),
      //     clientRepository.findOne({ where: { id: client2.id } }),
      //     clientRepository.findOne({ where: { id: client3.id } }),
      //   ]);

      // expect(deletedClient1).toBeNull();
      // expect(deletedClient2).toBeNull();
      // expect(remainingClient3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a client with sales pending payment.', async () => {
      const result1 = await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });

      const client1 = result1.history.insertedSales[0].client;
      const result2 = await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });

      const client2 = result2.history.insertedSales[0].client;

      const client3 = await CreateClient();

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/bulk`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          recordsIds: [
            { id: client1.id },
            { id: client2.id },
            { id: client3.id },
          ],
        })
        .expect(207);

      expect(body).toEqual({
        success: [client3.id],
        failed: [
          {
            id: client1.id,
            error: `The client ${client1.first_name} ${client1.last_name} has sales receivables`,
          },
          {
            id: client2.id,
            error: `The client ${client2.first_name} ${client2.last_name} has sales receivables`,
          },
        ],
      });
    });
  });

  describe('clients/sales/all (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionForUser(
        userTest.id,
        'find_all_clients_with_sales',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path clients/sales/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/sales/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get all sales for all clients', async () => {
      await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });
      await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });
      await reqTools.createSeedData({
        sales: {
          isReceivableGeneric: true,
          quantity: 1,
          quantityPerSaleGeneric: 5,
          variant: 'generic',
        },
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/clients/sales/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.body.total_row_count).toBeGreaterThan(0);
      expect(response.body.records).toBeInstanceOf(Array);
      response.body.records.forEach((record: Client) => {
        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('first_name');
        expect(record).toHaveProperty('last_name');
        expect(record).toHaveProperty('email');
        expect(record).toHaveProperty('cell_phone_number');
        expect(record).toHaveProperty('address');
        expect(record).toHaveProperty('createdDate');
        expect(record).toHaveProperty('updatedDate');
        expect(record).toHaveProperty('deletedDate');
        expect(record.deletedDate).toBeNull();
        expect(record).toHaveProperty('sales_detail');
        expect(record.sales_detail).toBeInstanceOf(Array);
        expect(record.sales_detail.length).toBeGreaterThan(0);
      });
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      const result = await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'create_client'),
        reqTools.removePermissionFromUser(userTest.id, 'find_all_clients'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_client'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_clients'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_client'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_client'),
        reqTools.removePermissionFromUser(
          userTest.id,
          'find_all_clients_with_sales',
        ),
        reqTools.removePermissionFromUser(userTest.id, 'export_clients_pdf'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/create', async () => {
      const bodyRequest: CreateClientDto = {
        ...clientDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/clients/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/clients/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/clients/update/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/clients/remove/one/${falseClientId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/export/all/pdf', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/export/all/pdf')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/clients/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action clients/sales/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/clients/sales/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
