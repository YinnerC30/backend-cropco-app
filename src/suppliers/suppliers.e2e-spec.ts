import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { describe } from 'node:test';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { SuppliersModule } from './suppliers.module';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { SalesModule } from 'src/sales/sales.module';
import { SalesService } from 'src/sales/sales.service';
import { CropsService } from 'src/crops/crops.service';
import { HarvestService } from 'src/harvest/harvest.service';
import { EmployeesService } from 'src/employees/employees.service';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';

describe('SuppliersController (e2e)', () => {
  let app: INestApplication;
  let supplierRepository: Repository<Supplier>;
  let seedService: SeedService;
  let authService: AuthService;
  let employeeService: EmployeesService;
  let saleService: SalesService;
  let cropService: CropsService;
  let harvestService: HarvestService;
  let userTest: User;
  let token: string;

  const supplierDtoTemplete: CreateSupplierDto = {
    first_name: InformationGenerator.generateFirstName(),
    last_name: InformationGenerator.generateLastName(),
    email: InformationGenerator.generateEmail(),
    cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
    address: InformationGenerator.generateAddress(),
  };

  const falseSupplierId = InformationGenerator.generateRandomId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        SuppliersModule,
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
              // logger: true
            };
          },
        }),
        CommonModule,
        SeedModule,
        AuthModule,
        SalesModule,
      ],
    }).compile();

    seedService = moduleFixture.get<SeedService>(SeedService);
    authService = moduleFixture.get<AuthService>(AuthService);
    saleService = moduleFixture.get<SalesService>(SalesService);
    cropService = moduleFixture.get<CropsService>(CropsService);
    harvestService = moduleFixture.get<HarvestService>(HarvestService);
    employeeService = moduleFixture.get<EmployeesService>(EmployeesService);
    supplierRepository = moduleFixture.get<Repository<Supplier>>(
      getRepositoryToken(Supplier),
    );

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

    await supplierRepository.delete({});
    userTest = (await seedService.CreateUser({})) as User;
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('suppliers/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /suppliers/create', async () => {
      const bodyRequest: CreateSupplierDto = {
        ...supplierDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/suppliers/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /suppliers/create', async () => {
      await authService.removePermission(userTest.id, 'create_supplier');

      const bodyRequest: CreateSupplierDto = {
        ...supplierDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/suppliers/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new supplier', async () => {
      await authService.addPermission(userTest.id, 'create_supplier');

      const bodyRequest: CreateSupplierDto = {
        ...supplierDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/suppliers/create')
        .set('Authorization', `Bearer ${token}`)
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
        'cell_phone_number must be shorter than or equal to 10 characters',
        'cell_phone_number must be a number string',
        'address must be shorter than or equal to 200 characters',
        'address must be a string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/suppliers/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a supplier with duplicate email.', async () => {
      const supplierWithSameEmail = await seedService.CreateSupplier({});

      const bodyRequest: CreateSupplierDto = {
        ...supplierDtoTemplete,
        email: supplierWithSameEmail.email,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/suppliers/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${bodyRequest.email}) already exists.`,
      );
    });
  });

  describe('suppliers/all (GET)', () => {
    beforeEach(async () => {
      try {
        await supplierRepository.delete({});
        await Promise.all(
          Array.from({ length: 17 }).map(() => seedService.CreateSupplier({})),
        );
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /suppliers/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/suppliers/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /suppliers/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_suppliers');
      const response = await request
        .default(app.getHttpServer())
        .get('/suppliers/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 suppliers for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_suppliers');
      const response = await request
        .default(app.getHttpServer())
        .get('/suppliers/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });
    it('should return all available records by sending the parameter all_records to true, ignoring other parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/suppliers/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((supplier: Supplier) => {
        expect(supplier).toHaveProperty('id');
        expect(supplier).toHaveProperty('first_name');
        expect(supplier).toHaveProperty('last_name');
        expect(supplier).toHaveProperty('email');
        expect(supplier).toHaveProperty('cell_phone_number');
        expect(supplier).toHaveProperty('address');
        expect(supplier).toHaveProperty('createdDate');
        expect(supplier).toHaveProperty('updatedDate');
        expect(supplier).toHaveProperty('deletedDate');
        expect(supplier.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of suppliers passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/suppliers/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((supplier: Supplier) => {
        expect(supplier).toHaveProperty('id');
        expect(supplier).toHaveProperty('first_name');
        expect(supplier).toHaveProperty('last_name');
        expect(supplier).toHaveProperty('email');
        expect(supplier).toHaveProperty('cell_phone_number');
        expect(supplier).toHaveProperty('address');
        expect(supplier).toHaveProperty('createdDate');
        expect(supplier).toHaveProperty('updatedDate');
        expect(supplier).toHaveProperty('deletedDate');
        expect(supplier.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of suppliers passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/suppliers/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((supplier: Supplier) => {
        expect(supplier).toHaveProperty('id');
        expect(supplier).toHaveProperty('first_name');
        expect(supplier).toHaveProperty('last_name');
        expect(supplier).toHaveProperty('email');
        expect(supplier).toHaveProperty('cell_phone_number');
        expect(supplier).toHaveProperty('address');
        expect(supplier).toHaveProperty('createdDate');
        expect(supplier).toHaveProperty('updatedDate');
        expect(supplier).toHaveProperty('deletedDate');
        expect(supplier.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/suppliers/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no supplier records with the requested pagination',
      );
    });
  });

  describe('suppliers/one/:id (GET)', () => {
    it('should throw an exception for not sending a JWT to the protected path suppliers/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/${falseSupplierId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action suppliers/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_supplier');
      const response = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one supplier', async () => {
      await authService.addPermission(userTest.id, 'find_one_supplier');
      const { id } = await seedService.CreateSupplier({});

      const response = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('supplies_shopping_details');
      expect(response.body.supplies_shopping_details).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('createdDate');
      expect(response.body).toHaveProperty('updatedDate');
      expect(response.body).toHaveProperty('deletedDate');
      expect(response.body.deletedDate).toBeNull();
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding supplier by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplier with id: ${falseSupplierId} not found`,
      );
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('suppliers/update/one/:id (PATCH)', () => {
    it('should throw an exception for not sending a JWT to the protected path suppliers/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${falseSupplierId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action suppliers/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_supplier');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one supplier', async () => {
      await authService.addPermission(userTest.id, 'update_one_supplier');
      const { id } = await seedService.CreateSupplier({});
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4', last_name: 'Doe 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
      expect(body.last_name).toEqual('Doe 4');
    });

    it('should throw exception for not finding supplier to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4' })
        .expect(404);
      expect(body.message).toEqual(
        `Supplier with id: ${falseSupplierId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the email for one that is in use.', async () => {
      const supplierWithSameEmail = await seedService.CreateSupplier({});
      const { id } = await seedService.CreateSupplier({});

      const bodyRequest = {
        email: supplierWithSameEmail.email,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/suppliers/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${bodyRequest.email}) already exists.`,
      );
    });
  });

  describe('suppliers/remove/one/:id (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path suppliers/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/suppliers/remove/one/${falseSupplierId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action suppliers/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_supplier');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/suppliers/remove/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one supplier', async () => {
      await authService.addPermission(userTest.id, 'remove_one_supplier');
      const { id } = await seedService.CreateSupplier({});

      await request
        .default(app.getHttpServer())
        .delete(`/suppliers/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/suppliers/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });
    it('You should throw exception for trying to delete a supplier that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/suppliers/remove/one/${falseSupplierId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Supplier with id: ${falseSupplierId} not found`,
      );
    });
  });

  describe('suppliers/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path suppliers/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/suppliers/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action suppliers/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_suppliers');
      const response = await request
        .default(app.getHttpServer())
        .delete('/suppliers/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete suppliers bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_suppliers');
      const [supplier1, supplier2, supplier3] = await Promise.all([
        await seedService.CreateSupplier({}),
        await seedService.CreateSupplier({}),
        await seedService.CreateSupplier({}),
      ]);

      const bulkData: RemoveBulkRecordsDto<Supplier> = {
        recordsIds: [{ id: supplier1.id }, { id: supplier2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/suppliers/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedSupplier1, deletedSupplier2, remainingSupplier3] =
        await Promise.all([
          supplierRepository.findOne({ where: { id: supplier1.id } }),
          supplierRepository.findOne({ where: { id: supplier2.id } }),
          supplierRepository.findOne({ where: { id: supplier3.id } }),
        ]);

      expect(deletedSupplier1).toBeNull();
      expect(deletedSupplier2).toBeNull();
      expect(remainingSupplier3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/suppliers/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });
  });

  // TODO: Implementar pruebas para el endpoint suppliers/shopping/all
});
