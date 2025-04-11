import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { IsNull, Not, Repository } from 'typeorm';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { Supply } from './entities/supply.entity';
import * as request from 'supertest';

import { SuppliesController } from './supplies.controller';
import { ShoppingController } from 'src/shopping/shopping.controller';
import { SuppliersController } from 'src/suppliers/suppliers.controller';
import { CreateShoppingSuppliesDto } from 'src/shopping/dto/create-shopping-supplies.dto';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

describe('SuppliesController e2e', () => {
  let app: INestApplication;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;
  let supplyRepository: Repository<Supply>;
  let suppliesController: SuppliesController;
  let suppliersController: SuppliersController;
  let shoppingController: ShoppingController;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),

        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            return {
              type: 'postgres',
              host: configService.get<string>('DB_HOST'),
              port: configService.get<number>('DB_PORT'),
              username: configService.get<string>('DB_USERNAME'),
              password: configService.get<string>('DB_PASSWORD'),
              database: configService.get<string>('DB_NAME'),
              entities: [__dirname + '../../**/*.entity{.ts,.js}'],
              synchronize: true,
            };
          },
        }),
        CommonModule,
        SeedModule,
        AuthModule,
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    suppliesController =
      moduleFixture.get<SuppliesController>(SuppliesController);
    suppliersController =
      moduleFixture.get<SuppliersController>(SuppliersController);

    shoppingController =
      moduleFixture.get<ShoppingController>(ShoppingController);

    authService = moduleFixture.get<AuthService>(AuthService);

    supplyRepository = moduleFixture.get<Repository<Supply>>(
      getRepositoryToken(Supply),
    );
    await supplyRepository.delete({});

    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        errorHttpStatusCode: 400,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('supplies/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /supplies/create', async () => {
      const data: CreateSupplyDto = {
        name: '',
        brand: '',
        unit_of_measure: 'GRAMOS',
        observation: '',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/create', async () => {
      await authService.removePermission(userTest.id, 'create_supply');

      const data: CreateSupplyDto = {
        name: '',
        brand: '',
        unit_of_measure: 'GRAMOS',
        observation: '',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new supply', async () => {
      await authService.addPermission(userTest.id, 'create_supply');

      const data: CreateSupplyDto = {
        name: 'supply name',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'name must be longer than or equal to 4 characters',
        'name must be a string',
        'brand must be longer than or equal to 10 characters',
        'brand must be a string',
        'unit_of_measure must be one of the following values: GRAMOS, MILILITROS',
        'unit_of_measure must be a string',
        'observation must be longer than or equal to 10 characters',
        'observation must be a string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a supply with duplicate name.', async () => {
      await suppliesController.create({
        name: 'SupplyName1',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      });

      const data: CreateSupplyDto = {
        name: 'SupplyName1',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      };

      const { body } = await request
        .default(app.getHttpServer())
        .post('/supplies/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${data.name}) already exists.`,
      );
    });
  });

  describe('supplies/all (GET)', () => {
    beforeAll(async () => {
      await supplyRepository.delete({});
      const result = await seedService.insertNewSupplies();
      if (result) {
        console.log('Inserted 15 supply records for testing');
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /supplies/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /supplies/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_supplies');
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 supplies for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_supplies');
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(15);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });
    it('should return all available records by sending the parameter all_records to true, ignoring other parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(15);
      expect(response.body.current_row_count).toEqual(15);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of supplies passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/supplies/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(15);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
        expect(supply.deletedDate).toBeNull();
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/supplies/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(15);
      expect(response2.body.current_row_count).toEqual(4);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((supply: Supply) => {
        expect(supply).toHaveProperty('id');
        expect(supply).toHaveProperty('name');
        expect(supply).toHaveProperty('brand');
        expect(supply).toHaveProperty('unit_of_measure');
        expect(supply).toHaveProperty('observation');
        expect(supply).toHaveProperty('stock');
        expect(supply).toHaveProperty('createdDate');
        expect(supply).toHaveProperty('updatedDate');
        expect(supply).toHaveProperty('deletedDate');
        expect(supply.deletedDate).toBeNull();
        expect(supply.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/supplies/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no supply records with the requested pagination',
      );
    });
  });

  describe('supplies/one/:id (GET)', () => {
    const supplyId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path supplies/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${supplyId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_supply');
      const response = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${supplyId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one supply', async () => {
      // Crear un supply de prueba
      await authService.addPermission(userTest.id, 'find_one_supply');
      const { id } = await suppliesController.create({
        name: 'SupplyName3',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      } as CreateSupplyDto);

      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('brand');
      expect(body).toHaveProperty('unit_of_measure');
      expect(body).toHaveProperty('observation');
      expect(body).toHaveProperty('stock');
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding supply by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Supply with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('supplies/update/one/:id (PATCH)', () => {
    const supplyId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path supplies/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${supplyId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_supply');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${supplyId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one supply', async () => {
      await authService.addPermission(userTest.id, 'update_one_supply');
      const supplyDemo = await suppliesController.create({
        name: 'SupplyName4',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      } as CreateSupplyDto);

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${supplyDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          brand: 'Change brand supply',
          observation: 'Change observation supply',
        })
        .expect(200);

      expect(body.observation).toEqual('Change observation supply');
      expect(body.brand).toEqual('Change brand supply');
      expect(body.name).toEqual('SupplyName4');
      expect(body.unit_of_measure).toEqual(supplyDemo.unit_of_measure);
    });

    it('should throw exception for not finding supply to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ observation: 'New observation' })
        .expect(404);
      expect(body.message).toEqual(
        'Supply with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the name for one that is in use.', async () => {
      const supplyDemo = await suppliesController.create({
        name: 'SupplyName5',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      } as CreateSupplyDto);

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/supplies/update/one/${supplyDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'SupplyName4' })
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (name)=(SupplyName4) already exists.',
      );
    });
  });

  describe('supplies/remove/one/:id (DELETE)', () => {
    const supplyId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path supplies/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supplyId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_supply');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supplyId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one supply', async () => {
      await authService.addPermission(userTest.id, 'remove_one_supply');
      const supplyDemo = await suppliesController.create({
        name: 'SupplyName6',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      } as CreateSupplyDto);

      await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supplyDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/supplies/one/${supplyDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a supply that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Supply with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw an exception when trying to delete a supply with stock available', async () => {
      // Crear suministro de prueba
      const supply = await suppliesController.create({
        name: 'SupplyName7',
        brand: 'brand name',
        unit_of_measure: 'GRAMOS',
        observation: 'none observation',
      } as CreateSupplyDto);

      // Crear proveedor de prueba
      const supplier = await suppliersController.create({
        first_name: 'John',
        last_name: 'Doe',
        email: `supplierDoe${Math.random() * 100}@gmail.com`,
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      await shoppingController.create({
        date: new Date().toISOString(),
        total: 20_000,
        details: [
          {
            supply: { id: supply.id },
            supplier: { id: supplier.id },
            amount: 4000,
            total: 20_000,
          },
        ],
      } as CreateShoppingSuppliesDto);

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/one/${supply.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body.message).toEqual(
        `Supply with id ${supply.name} has stock available`,
      );
    });
  });

  describe('supplies/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path supplies/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action supplies/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_supplies');
      const response = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete supplies bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_supplies');
      // Crear supplies de prueba
      const [supply1, supply2, supply3] = await supplyRepository.find({
        where: {
          stock: { id: IsNull() },
        },
        take: 3,
      });

      console.log(supply1, supply2, supply3);

      const bulkData: RemoveBulkRecordsDto<Supply> = {
        recordsIds: [{ id: supply1.id }, { id: supply2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedClient1, deletedClient2, remainingClient3] =
        await Promise.all([
          supplyRepository.findOne({ where: { id: supply1.id } }),
          supplyRepository.findOne({ where: { id: supply2.id } }),
          supplyRepository.findOne({ where: { id: supply3.id } }),
        ]);

      expect(deletedClient1).toBeNull();
      expect(deletedClient2).toBeNull();
      expect(remainingClient3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/supplies/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a supply with stock available.', async () => {
      const [supply1, supply2, supply3] = await supplyRepository.find({
        where: {
          stock: { id: IsNull() },
        },
        take: 3,
      });

      const [supplier] = (
        await suppliersController.findAll({ limit: 1, offset: 0 })
      ).records;

      await shoppingController.create({
        date: new Date().toISOString(),
        total: 20_000,
        details: [
          {
            supply: { id: supply1.id },
            supplier: { id: supplier.id },
            amount: 4000,
            total: 20_000,
          },
        ],
      } as CreateShoppingSuppliesDto);

      await shoppingController.create({
        date: new Date().toISOString(),
        total: 20_000,
        details: [
          {
            supply: { id: supply2.id },
            supplier: { id: supplier.id },
            amount: 4000,
            total: 20_000,
          },
        ],
      } as CreateShoppingSuppliesDto);

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/supplies/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [
            { id: supply1.id },
            { id: supply2.id },
            { id: supply3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [supply3.id],
        failed: [
          {
            id: supply1.id,
            error: `Supply with id ${supply1.name} has stock available`,
          },
          {
            id: supply2.id,
            error: `Supply with id ${supply2.name} has stock available`,
          },
        ],
      });
    });
  });
});
