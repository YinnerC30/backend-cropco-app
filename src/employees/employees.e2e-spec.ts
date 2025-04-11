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
import { CropsService } from 'src/crops/crops.service';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { CreateHarvestDto } from 'src/harvest/dto/create-harvest.dto';
import { HarvestService } from 'src/harvest/harvest.service';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { WorkService } from 'src/work/work.service';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeesModule } from './employees.module';
import { Employee } from './entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let employeeRepository: Repository<Employee>;
  let seedService: SeedService;
  let authService: AuthService;
  // let employeeService: EmployeesService;
  // let saleService: SalesService;
  let cropService: CropsService;
  let harvestService: HarvestService;
  let workService: WorkService;
  let userTest: User;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        EmployeesModule,
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
    authService = moduleFixture.get<AuthService>(AuthService);
    workService = moduleFixture.get<WorkService>(WorkService);
    cropService = moduleFixture.get<CropsService>(CropsService);
    harvestService = moduleFixture.get<HarvestService>(HarvestService);
    // employeeService = moduleFixture.get<EmployeesService>(EmployeesService);

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

    employeeRepository = moduleFixture.get<Repository<Employee>>(
      getRepositoryToken(Employee),
    );

    await employeeRepository.delete({});
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  async function createTestEmployee(data: CreateEmployeeDto) {
    const employee = employeeRepository.create(data);
    return await employeeRepository.save(employee);
  }

  describe('employees/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /employees/create', async () => {
      const data: CreateEmployeeDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .send(data)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /employees/create', async () => {
      await authService.removePermission(userTest.id, 'create_employee');

      const data: CreateEmployeeDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new employee', async () => {
      await authService.addPermission(userTest.id, 'create_employee');

      const data: CreateEmployeeDto = {
        first_name: 'Daniel',
        last_name: 'Gomez',
        email: 'daniel@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(201);
      expect(response.body).toMatchObject(data);
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
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a employee with duplicate email.', async () => {
      await createTestEmployee({
        first_name: 'Stiven',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      });

      const data: CreateEmployeeDto = {
        first_name: 'David',
        last_name: 'Gomez',
        email: 'Stiven@gmail.com',
        cell_phone_number: '3146652134',
        address: 'Dirección de prueba...',
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .send(data)
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (email)=(Stiven@gmail.com) already exists.',
      );
    });
  });

  describe('employees/all (GET)', () => {
    beforeAll(async () => {
      await employeeRepository.delete({});
      await seedService.insertNewEmployees();
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /employees/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_employees');
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 employees for default by not sending paging parameters', async () => {
      await authService.addPermission(userTest.id, 'find_all_employees');
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/all')
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
        .get('/employees/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
      response.body.records.forEach((employee: Employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('first_name');
        expect(employee).toHaveProperty('last_name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('cell_phone_number');
        expect(employee).toHaveProperty('address');
        expect(employee).toHaveProperty('createdDate');
        expect(employee).toHaveProperty('updatedDate');
        expect(employee).toHaveProperty('deletedDate');
        expect(employee.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of employees passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/employees/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(17);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((employee: Employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('first_name');
        expect(employee).toHaveProperty('last_name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('cell_phone_number');
        expect(employee).toHaveProperty('address');
        expect(employee).toHaveProperty('createdDate');
        expect(employee).toHaveProperty('updatedDate');
        expect(employee).toHaveProperty('deletedDate');
        expect(employee.deletedDate).toBeNull();
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/employees/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(17);
      expect(response2.body.current_row_count).toEqual(6);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((employee: Employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('first_name');
        expect(employee).toHaveProperty('last_name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('cell_phone_number');
        expect(employee).toHaveProperty('address');
        expect(employee).toHaveProperty('createdDate');
        expect(employee).toHaveProperty('updatedDate');
        expect(employee).toHaveProperty('deletedDate');
        expect(employee.deletedDate).toBeNull();
      });
    });
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/employees/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no employee records with the requested pagination',
      );
    });
  });

  describe('employees/one/:id (GET)', () => {
    const employeeId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path employees/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${employeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_employee');
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${employeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one employee', async () => {
      // Crear un employeee de prueba
      await authService.addPermission(userTest.id, 'find_one_employee');
      const { id } = await createTestEmployee({
        first_name: 'John 3',
        last_name: 'Doe',
        email: 'john.doe3@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('first_name');
      expect(response.body).toHaveProperty('last_name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('cell_phone_number');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('harvests_detail');
      expect(response.body.harvests_detail).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('payments');
      expect(response.body.payments).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('works_detail');
      expect(response.body.works_detail).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('createdDate');
      expect(response.body).toHaveProperty('updatedDate');
      expect(response.body).toHaveProperty('deletedDate');
      expect(response.body.deletedDate).toBeNull();
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/employees/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding employee by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/employees/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Employee with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/employees/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('employees/update/one/:id (PATCH)', () => {
    const employeeId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path employees/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${employeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/update/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_employee');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${employeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should update one employee', async () => {
      await authService.addPermission(userTest.id, 'update_one_employee');
      const { id } = await createTestEmployee({
        first_name: 'John 3.5',
        last_name: 'Doe',
        email: 'john.doe3.5@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4', last_name: 'Doe 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
      expect(body.last_name).toEqual('Doe 4');
      expect(body.email).toEqual('john.doe3.5@example.com');
      expect(body.cell_phone_number).toEqual('3007890123');
      expect(body.address).toEqual('123 Main St');
    });

    it('should throw exception for not finding employee to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4' })
        .expect(404);
      expect(body.message).toEqual(
        'Employee with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the email for one that is in use.', async () => {
      const { id } = await createTestEmployee({
        first_name: 'Alan',
        last_name: 'Demo',
        email: 'alandemo@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'john.doe3.5@example.com' })
        .expect(400);
      expect(body.message).toEqual(
        'Unique constraint violation, Key (email)=(john.doe3.5@example.com) already exists.',
      );
    });
  });

  describe('employees/remove/one/:id (DELETE)', () => {
    const employeeId = 'fb3c5165-3ea7-427b-acee-c04cd879cedc';
    it('should throw an exception for not sending a JWT to the protected path employees/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_employee');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one employee', async () => {
      await authService.addPermission(userTest.id, 'remove_one_employee');
      const { id } = await createTestEmployee({
        first_name: 'Ana 4.5',
        last_name: 'Doe',
        email: 'Ana.doe4.5@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });
    it('You should throw exception for trying to delete a employee that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/2f6b49e7-5114-463b-8e7c-748633a9e157`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'Employee with id: 2f6b49e7-5114-463b-8e7c-748633a9e157 not found',
      );
    });

    it('should throw an exception when trying to delete a employee with harvests or works with pending payment.', async () => {
      // Crear employeee de prueba
      const employee1 = await createTestEmployee({
        first_name: 'Employee for harvest',
        last_name: 'Doe',
        email: 'employeeforharvest@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const employee2 = await createTestEmployee({
        first_name: 'Employee for work',
        last_name: 'Doe',
        email: 'employeeforwork@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      // Crear cultivo de prueba
      const crop = await cropService.create({
        name: `Crop for sale ${Math.random() * 100}`,
        description: 'Crop for sale',
        units: 10,
        location: 'Main St',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      // Crear cosecha de prueba
      const harvestData = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        details: [
          { employee: { id: employee1.id }, total: 10, value_pay: 1000 },
        ],
        total: 10,
        value_pay: 1000,
        observation: 'description demo test creation harvest...',
      };

      await harvestService.create(harvestData as CreateHarvestDto);

      await workService.create({
        date: new Date().toISOString(),
        crop: { id: crop.id },
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 1000,
            payment_is_pending: true,
          },
        ],
        total: 10,
        value_pay: 1000,
        description: 'description demo test creation harvest...',
      } as any);

      // Intentar eliminar el employee
      const { body: body1 } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employee1.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body1.message).toEqual(
        `Cannot remove employee with harvests pending payment`,
      );

      const { body: body2 } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employee2.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body2.message).toEqual(
        `Cannot remove employee with works pending payment`,
      );
    });
  });

  describe('employees/remove/bulk (DELETE)', () => {
    it('should throw an exception for not sending a JWT to the protected path employees/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_employees');
      const response = await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete employees bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_employees');
      // Crear employeees de prueba
      const [employee1, employee2, employee3] = await Promise.all([
        createTestEmployee({
          first_name: 'John 2',
          last_name: 'Doe',
          email: 'john.doefg2@example.com',
          cell_phone_number: '3007890123',
          address: '123 Main St',
        }),
        createTestEmployee({
          first_name: 'Jane4 2',
          last_name: 'Smith',
          email: 'jane.smith32@example.com',
          cell_phone_number: '3007890123',
          address: '456 Elm St',
        }),
        createTestEmployee({
          first_name: 'Jane 3',
          last_name: 'Smith',
          email: 'jane.smith35@example.com',
          cell_phone_number: '3007890123',
          address: '456 Elm St',
        }),
      ]);

      const bulkData: RemoveBulkRecordsDto<Employee> = {
        recordsIds: [{ id: employee1.id }, { id: employee2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedEmployee1, deletedEmployee2, remainingEmployee3] =
        await Promise.all([
          employeeRepository.findOne({ where: { id: employee1.id } }),
          employeeRepository.findOne({ where: { id: employee2.id } }),
          employeeRepository.findOne({ where: { id: employee3.id } }),
        ]);

      expect(deletedEmployee1).toBeNull();
      expect(deletedEmployee2).toBeNull();
      expect(remainingEmployee3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a employee with sales pending payment.', async () => {
      // Crear employeee de prueba
      const employee1 = await createTestEmployee({
        first_name: 'Employee for sale 1',
        last_name: 'Doe',
        email: 'employeeforsale1@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const employee2 = await createTestEmployee({
        first_name: 'Employee for sale 2',
        last_name: 'Doe',
        email: 'employeeforsale2@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });
      const employee3 = await createTestEmployee({
        first_name: 'Employee for sale 3',
        last_name: 'Doe',
        email: 'employeeforsale3@example.com',
        cell_phone_number: '3007890123',
        address: '123 Main St',
      });

      // Crear cultivo de prueba
      const crop = await cropService.create({
        name: `Crop for sale ${Math.random() * 100}`,
        description: 'Crop for sale',
        units: 10,
        location: 'Main St',
        date_of_creation: new Date().toISOString(),
      } as CreateCropDto);

      // Crear cosecha de prueba
      const harvestData = {
        date: new Date().toISOString(),
        crop: { id: crop.id },
        details: [
          { employee: { id: employee1.id }, total: 600, value_pay: 450000 },
        ],
        total: 600,
        value_pay: 450000,
        observation: 'description demo test creation harvest...',
      };

      await harvestService.create(harvestData as CreateHarvestDto);

      await workService.create({
        date: new Date().toISOString(),
        crop: { id: crop.id },
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 1000,
            payment_is_pending: true,
          },
        ],
        total: 10,
        value_pay: 1000,
        description: 'description demo test creation harvest...',
      } as any);

      // Intentar eliminar el employee
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/bulk`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          recordsIds: [
            { id: employee1.id },
            { id: employee2.id },
            { id: employee3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [employee3.id],
        failed: [
          {
            id: employee1.id,
            error: 'Cannot remove employee with harvests pending payment',
          },
          {
            id: employee2.id,
            error: 'Cannot remove employee with works pending payment',
          },
        ],
      });
    });
  });

  // TODO: Implementar pruebas para estos endpoints
  // TODO: pending-payments/all
  // TODO: made-payments/all
  // TODO: pending-payments/one/:id
  // TODO: harvests/all
  // TODO: works/all
  // TODO: find/certification/one/:id
  // TODO: find/top-employees-in-harvests
  // TODO: find/top-employees-in-works
});
