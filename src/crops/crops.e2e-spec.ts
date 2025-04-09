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
import * as request from 'supertest';
import { CreateCropDto } from './dto/create-crop.dto';
import { Repository } from 'typeorm';
import { Crop } from './entities/crop.entity';

import { EmployeesService } from 'src/employees/employees.service';
import { HarvestService } from 'src/harvest/harvest.service';

import { CreateHarvestDto } from 'src/harvest/dto/create-harvest.dto';
import { ClientsService } from 'src/clients/clients.service';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';

describe('CropsController e2e', () => {
  let app: INestApplication;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;
  let cropRepository: Repository<Crop>;
  let clientService: ClientsService;
  let employeeService: EmployeesService;
  let harvestService: HarvestService;

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
    clientService = moduleFixture.get<ClientsService>(ClientsService);

    harvestService = moduleFixture.get<HarvestService>(HarvestService);
    employeeService = moduleFixture.get<EmployeesService>(EmployeesService);

    authService = moduleFixture.get<AuthService>(AuthService);

    cropRepository = moduleFixture.get<Repository<Crop>>(
      getRepositoryToken(Crop),
    );
    await cropRepository.delete({});
    await clientService.deleteAllClients();
    await harvestService.deleteAllHarvest();

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

  async function createTestCrop(data: CreateCropDto) {
    const crop = cropRepository.create(data);
    return await cropRepository.save(crop);
  }

  describe('crops/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /crops/create', async () => {
      const data = {
        name: 'CropName',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toLocaleString(),
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /crops/create', async () => {
      await authService.removePermission(userTest.id, 'create_crop');

      const data = {
        name: 'CropName',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toLocaleString(),
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new crop', async () => {
      await authService.addPermission(userTest.id, 'create_crop');

      const data = {
        name: 'CropName',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);

      expect(response.body).toMatchObject(data);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'name must be longer than or equal to 4 characters',
        'name must be a string',
        'units must not be less than 1',
        'units must be an integer number',
        'location must be longer than or equal to 4 characters',
        'location must be a string',
        'date_of_creation must be a valid ISO 8601 date string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a crop with duplicate name.', async () => {
      await createTestCrop({
        name: 'CropName1',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      const data: CreateCropDto = {
        name: 'CropName1',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto;

      const { body } = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${data.name}) already exists.`,
      );
    });
  });

  describe('crops/all (GET)', () => {
    beforeAll(async () => {
      await cropRepository.delete({});
      const result = await seedService.insertNewCrops();
      if (result) {
        console.log('Inserted 15 crop records for testing');
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /crops/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /crops/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_crops');
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 crops for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_crops');
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
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
        .get('/crops/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(15);
      expect(response.body.current_row_count).toEqual(15);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((crop: Crop) => {
        expect(crop).toHaveProperty('id');
        expect(crop).toHaveProperty('name');
        expect(crop).toHaveProperty('description');
        expect(crop).toHaveProperty('units');
        expect(crop).toHaveProperty('location');
        expect(crop).toHaveProperty('date_of_creation');
        expect(crop).toHaveProperty('date_of_termination');
        expect(crop).toHaveProperty('harvests_stock');
        expect(crop).toHaveProperty('createdDate');
        expect(crop).toHaveProperty('updatedDate');
        expect(crop).toHaveProperty('deletedDate');
        expect(crop.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of crops passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/crops/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(15);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((crop: Crop) => {
        expect(crop).toHaveProperty('id');
        expect(crop).toHaveProperty('name');
        expect(crop).toHaveProperty('description');
        expect(crop).toHaveProperty('units');
        expect(crop).toHaveProperty('location');
        expect(crop).toHaveProperty('date_of_creation');
        expect(crop).toHaveProperty('date_of_termination');
        expect(crop).toHaveProperty('harvests_stock');
        expect(crop).toHaveProperty('createdDate');
        expect(crop).toHaveProperty('updatedDate');
        expect(crop).toHaveProperty('deletedDate');
        expect(crop.deletedDate).toBeNull();
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/crops/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(15);
      expect(response2.body.current_row_count).toEqual(4);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((crop: Crop) => {
        expect(crop).toHaveProperty('id');
        expect(crop).toHaveProperty('name');
        expect(crop).toHaveProperty('description');
        expect(crop).toHaveProperty('units');
        expect(crop).toHaveProperty('location');
        expect(crop).toHaveProperty('date_of_creation');
        expect(crop).toHaveProperty('date_of_termination');
        expect(crop).toHaveProperty('harvests_stock');
        expect(crop).toHaveProperty('createdDate');
        expect(crop).toHaveProperty('updatedDate');
        expect(crop).toHaveProperty('deletedDate');
        expect(crop.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no crop records with the requested pagination',
      );
    });
  });

  describe('crops/one/:id (GET)', () => {
    const cropId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path crops/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${cropId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_crop');
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${cropId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one crop', async () => {
      // Crear un crope de prueba
      await authService.addPermission(userTest.id, 'find_one_crop');
      const { id } = await createTestCrop({
        name: 'CropName3',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('name');
      expect(body).toHaveProperty('description');
      expect(body).toHaveProperty('units');
      expect(body).toHaveProperty('location');
      expect(body).toHaveProperty('date_of_creation');
      expect(body).toHaveProperty('date_of_termination');
      expect(body).toHaveProperty('harvests_stock');
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();
      expect(body).toHaveProperty('sales_detail');
      expect(body.sales_detail).toBeInstanceOf(Array);
      expect(body.supplies_consumption_details).toBeInstanceOf(Array);
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding crop by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Crop with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('crops/update/one/:id (PATCH)', () => {
    const cropId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path crops/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${cropId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_crop');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${cropId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one crop', async () => {
      await authService.addPermission(userTest.id, 'update_one_crop');
      const cropDemo = await createTestCrop({
        name: 'CropName4',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${cropDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          description: 'Change description crop',
          location: 'Change location crop',
        })
        .expect(200);

      expect(body.description).toEqual('Change description crop');
      expect(body.location).toEqual('Change location crop');
      expect(body.name).toEqual('CropName4');
      expect(body.units).toEqual(cropDemo.units);
      expect(body.date_of_creation).toEqual(
        cropDemo.date_of_creation.split('T')[0],
      );
    });

    it('should throw exception for not finding crop to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'New location' })
        .expect(404);
      expect(body.message).toEqual(
        'Crop with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the name for one that is in use.', async () => {
      const cropDemo = await createTestCrop({
        name: 'CropName5',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${cropDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'CropName4' })
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (name)=(CropName4) already exists.',
      );
    });
  });

  describe('crops/remove/one/:id (DELETE)', () => {
    const cropId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path crops/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${cropId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_crop');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${cropId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one crop', async () => {
      await authService.addPermission(userTest.id, 'remove_one_crop');
      const cropDemo = await createTestCrop({
        name: 'CropName6',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${cropDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${cropDemo.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a crop that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Crop with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw an exception when trying to delete a crop with stock available', async () => {
      // Crear cultivo de prueba
      const crop = await createTestCrop({
        name: 'CropName7',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      // Crear empleado de prueba
      const employee = await employeeService.create({
        first_name: 'John',
        last_name: 'Doe',
        email: `employeedoe${Math.random() * 100}@gmail.com`,
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      // Crear cosecha de prueba
      const harvestData = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        details: [
          { employee: { id: employee.id }, total: 10, value_pay: 1000 },
        ],
        total: 10,
        value_pay: 1000,
        observation: 'description demo test creation harvest...',
      };

      const harvest = await harvestService.create(
        harvestData as CreateHarvestDto,
      );

      // Agregar stock al cultivo
      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: crop.id },
        harvest: { id: harvest.id },
        total: 10,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${crop.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body.message).toEqual(`Crop has stock available`);
    });
  });

  describe('crops/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path crops/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_crops');
      const response = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete crops bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_crops');
      // Crear cropes de prueba
      const [crop1, crop2, crop3] = await Promise.all([
        createTestCrop({
          name: 'CropName8',
          description: 'Crop description...',
          units: 10,
          location: 'Location of the crop...',
          date_of_creation: new Date().toISOString(),
        } as CreateCropDto),
        createTestCrop({
          name: 'CropName9',
          description: 'Crop description...',
          units: 10,
          location: 'Location of the crop...',
          date_of_creation: new Date().toISOString(),
        } as CreateCropDto),
        createTestCrop({
          name: 'CropName10',
          description: 'Crop description...',
          units: 10,
          location: 'Location of the crop...',
          date_of_creation: new Date().toISOString(),
        } as CreateCropDto),
      ]);

      const bulkData: RemoveBulkRecordsDto<Crop> = {
        recordsIds: [{ id: crop1.id }, { id: crop2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedClient1, deletedClient2, remainingClient3] =
        await Promise.all([
          cropRepository.findOne({ where: { id: crop1.id } }),
          cropRepository.findOne({ where: { id: crop2.id } }),
          cropRepository.findOne({ where: { id: crop3.id } }),
        ]);

      expect(deletedClient1).toBeNull();
      expect(deletedClient2).toBeNull();
      expect(remainingClient3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a crop with stock available.', async () => {
      // Crear cultivo de prueba
      const crop1 = await createTestCrop({
        name: 'CropName11',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);
      const crop2 = await createTestCrop({
        name: 'CropName12',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);
      const crop3 = await createTestCrop({
        name: 'CropName13',
        description: 'Crop description...',
        units: 10,
        location: 'Location of the crop...',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      // Crear empleado de prueba
      const employee = await employeeService.create({
        first_name: 'John',
        last_name: 'Doe',
        email: `employeedoe${Math.random() * 100}@gmail.com`,
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      // Crear cosecha de prueba
      const harvestData1 = {
        date: new Date().toISOString(),
        crop: { id: crop1.id },
        details: [
          { employee: { id: employee.id }, total: 10, value_pay: 1000 },
        ],
        total: 10,
        value_pay: 1000,
        observation: 'description demo test creation harvest...',
      };

      const harvest1 = await harvestService.create(
        harvestData1 as CreateHarvestDto,
      );

      // Agregar stock al cultivo
      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: crop1.id },
        harvest: { id: harvest1.id },
        total: 10,
      });

      const harvestData2 = {
        date: new Date().toISOString(),
        crop: { id: crop2.id },
        details: [
          { employee: { id: employee.id }, total: 10, value_pay: 1000 },
        ],
        total: 10,
        value_pay: 1000,
        observation: 'description demo test creation harvest...',
      };
      const harvest2 = await harvestService.create(
        harvestData2 as CreateHarvestDto,
      );

      // Agregar stock al cultivo
      await harvestService.createHarvestProcessed({
        date: new Date().toISOString(),
        crop: { id: crop2.id },
        harvest: { id: harvest2.id },
        total: 10,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [{ id: crop1.id }, { id: crop2.id }, { id: crop3.id }],
        })
        .expect(207);
      expect(body).toEqual({
        success: [crop3.id],
        failed: [
          {
            id: crop1.id,
            error: 'Crop has stock available',
          },
          {
            id: crop2.id,
            error: 'Crop has stock available',
          },
        ],
      });
    });
  });
});
