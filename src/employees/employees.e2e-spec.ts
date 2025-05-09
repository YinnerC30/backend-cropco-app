import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';

import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeesModule } from './employees.module';
import { Employee } from './entities/employee.entity';

describe('EmployeesController (e2e)', () => {
  let app: INestApplication;
  let employeeRepository: Repository<Employee>;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;

  const employeeDtoTemplete: CreateEmployeeDto = {
    first_name: InformationGenerator.generateFirstName(),
    last_name: InformationGenerator.generateLastName(),
    email: InformationGenerator.generateEmail(),
    cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
    address: InformationGenerator.generateAddress(),
  };

  const falseEmployeeId = InformationGenerator.generateRandomId();

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
    employeeRepository = moduleFixture.get<Repository<Employee>>(
      getRepositoryToken(Employee),
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

    await employeeRepository.delete({});
    userTest = (await seedService.CreateUser({})) as User;
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('employees/create (POST)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'create_employee');
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/create', async () => {
      const bodyRequest: CreateEmployeeDto = {
        ...employeeDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new employee', async () => {
      const bodyRequest: CreateEmployeeDto = {
        ...employeeDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
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
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a employee with duplicate email.', async () => {
      const employeeWithSameEmail = await seedService.CreateEmployee({});

      const bodyRequest: CreateEmployeeDto = {
        ...employeeDtoTemplete,
        email: employeeWithSameEmail.email,
      };
      const { body } = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${bodyRequest.email}) already exists.`,
      );
    });
  });

  describe('employees/all (GET)', () => {
    beforeAll(async () => {
      try {
        await employeeRepository.delete({});
        await Promise.all(
          Array.from({ length: 17 }).map(() => seedService.CreateEmployee({})),
        );
        await authService.addPermission(userTest.id, 'find_all_employees');
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 employees for default by not sending paging parameters', async () => {
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
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'find_one_employee');
    });

    it('should throw an exception for not sending a JWT to the protected path employees/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${falseEmployeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one employee', async () => {
      const { id } = await seedService.CreateEmployee({});

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
        .get(`/employees/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Employee with id: ${falseEmployeeId} not found`,
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
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'update_one_employee');
    });

    it('should throw an exception for not sending a JWT to the protected path employees/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${falseEmployeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one employee', async () => {
      const { id } = await seedService.CreateEmployee({});
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4', last_name: 'Doe 4' })
        .expect(200);

      expect(body.first_name).toEqual('John 4');
      expect(body.last_name).toEqual('Doe 4');
    });

    it('should throw exception for not finding employee to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ first_name: 'John 4' })
        .expect(404);
      expect(body.message).toEqual(
        `Employee with id: ${falseEmployeeId} not found`,
      );
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the email for one that is in use.', async () => {
      const employeeWithSameEmail = await seedService.CreateEmployee({});
      const { id } = await seedService.CreateEmployee({});

      const bodyRequest = {
        email: employeeWithSameEmail.email,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (email)=(${bodyRequest.email}) already exists.`,
      );
    });
  });

  describe('employees/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'remove_one_employee');
    });

    it('should throw an exception for not sending a JWT to the protected path employees/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${falseEmployeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one employee', async () => {
      const { id } = await seedService.CreateEmployee({});

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
        .delete(`/employees/remove/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Employee with id: ${falseEmployeeId} not found`,
      );
    });

    it('should throw an exception when trying to delete a employee with harvests with pending payment.', async () => {
      const { employees } = await seedService.CreateHarvest({});

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employees[0].id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body.message).toEqual(
        `Employee with id ${employees[0].id} cannot be removed, has unpaid harvests`,
      );
    });

    it('should throw an exception when trying to delete a employee with harvests or works with pending payment.', async () => {
      const { employees } = await seedService.CreateWork({});

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${employees[0].id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(409);
      expect(body.message).toEqual(
        `Employee with id ${employees[0].id} cannot be removed, has unpaid works`,
      );
    });
  });

  describe('employees/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_employees');
    });

    it('should throw an exception for not sending a JWT to the protected path employees/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete employees bulk', async () => {
      const [employee1, employee2, employee3] = await Promise.all([
        await seedService.CreateEmployee({}),
        await seedService.CreateEmployee({}),
        await seedService.CreateEmployee({}),
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

    it('should throw an exception when trying to delete a employee with pending payments.', async () => {
      const harvest = await seedService.CreateHarvest({});
      const work = await seedService.CreateWork({});

      const employee1 = harvest.employees[0];
      const employee2 = work.employees[0];
      const employee3 = await seedService.CreateEmployee({});

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
            error: `Employee with id ${employee1.id} cannot be removed, has unpaid harvests`,
          },
          {
            id: employee2.id,
            error: `Employee with id ${employee2.id} cannot be removed, has unpaid works`,
          },
        ],
      });
    });
  });

  describe('employees/pending-payments/all (GET)', () => {
    beforeAll(async () => {
      try {
        await employeeRepository.delete({});
        await Promise.all([
          seedService.CreateHarvest({ quantityEmployees: 8 }),
          seedService.CreateWork({ quantityEmployees: 9 }),
        ]);
        await authService.addPermission(
          userTest.id,
          'find_all_employees_with_pending_payments',
        );
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/pending-payments/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/pending-payments/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only employees with pending payments', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/pending-payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
    });
  });

  describe('employees/made-payments/all (GET)', () => {
    beforeAll(async () => {
      try {
        await employeeRepository.delete({});
        const {
          harvest: { details },
        } = await seedService.CreateHarvest({ quantityEmployees: 8 });

        await Promise.all([
          seedService.CreatePayment({
            employeeId: details[0].employee.id,
            value_pay: details[0].value_pay,
            harvestsId: [details[0].id],
          }),

          seedService.CreatePayment({
            employeeId: details[1].employee.id,
            value_pay: details[1].value_pay,
            harvestsId: [details[1].id],
          }),
          seedService.CreatePayment({
            employeeId: details[2].employee.id,
            value_pay: details[2].value_pay,
            harvestsId: [details[2].id],
          }),
        ]);

        await authService.addPermission(
          userTest.id,
          'find_all_employees_with_made_payments',
        );
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/made-payments/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/made-payments/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only employees with made payments', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/made-payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(3);
      expect(response.body.current_row_count).toEqual(3);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);
    });
  });

  describe('employees/pending-payments/one/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'find_one_employee_with_pending_payments',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/pending-payments/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/pending-payments/one/${falseEmployeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only one employee with pending payments', async () => {
      const employee = await seedService.CreateEmployee({});

      const harvest = await seedService.CreateHarvestForEmployee({
        employeeId: employee.id,
      });
      const work = await seedService.CreateWorkForEmployee({
        employeeId: employee.id,
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/pending-payments/one/${employee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const body = response.body as Employee;

      console.log('🚀 ~ it ~ body:', body);
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('first_name');
      expect(body).toHaveProperty('last_name');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('cell_phone_number');
      expect(body).toHaveProperty('address');
      expect(body).toHaveProperty('harvests_detail');
      expect(body.harvests_detail).toBeInstanceOf(Array);
      expect(body).toHaveProperty('works_detail');
      expect(body.works_detail).toBeInstanceOf(Array);
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();

      if (body.works_detail.length > 0) {
        body.works_detail.forEach((workDetail) => {
          expect(workDetail.payment_is_pending).toBe(true);
        });
      }
      if (body.harvests_detail.length > 0) {
        body.harvests_detail.forEach((harvestDetail) => {
          expect(harvestDetail.payment_is_pending).toBe(true);
        });
      }
    });
  });

  describe('employees/harvests/all (GET)', () => {
    beforeAll(async () => {
      try {
        await employeeRepository.delete({});

        await seedService.CreateHarvest({ quantityEmployees: 8 });

        await authService.addPermission(
          userTest.id,
          'find_all_employees_with_harvests',
        );
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/harvests/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/harvests/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only employees with harvests', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/harvests/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(8);
      expect(response.body.current_row_count).toEqual(8);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('first_name');
        expect(employee).toHaveProperty('last_name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('cell_phone_number');
        expect(employee).toHaveProperty('address');
        expect(employee).toHaveProperty('harvests_detail');
        expect(employee.harvests_detail).toBeInstanceOf(Array);
        expect(employee).toHaveProperty('createdDate');
        expect(employee).toHaveProperty('updatedDate');
        expect(employee).toHaveProperty('deletedDate');
        expect(employee.deletedDate).toBeNull();

        expect(employee.harvests_detail).toBeInstanceOf(Array);
        expect(employee.harvests_detail.length).toBeGreaterThan(0);
      });
    });
  });
  describe('employees/works/all (GET)', () => {
    beforeAll(async () => {
      try {
        await employeeRepository.delete({});

        await seedService.CreateWork({ quantityEmployees: 8 });

        await authService.addPermission(
          userTest.id,
          'find_all_employees_with_works',
        );
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /employees/works/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/works/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only employees with works', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/works/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(8);
      expect(response.body.current_row_count).toEqual(8);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((employee) => {
        expect(employee).toHaveProperty('id');
        expect(employee).toHaveProperty('first_name');
        expect(employee).toHaveProperty('last_name');
        expect(employee).toHaveProperty('email');
        expect(employee).toHaveProperty('cell_phone_number');
        expect(employee).toHaveProperty('address');
        expect(employee).toHaveProperty('works_detail');
        expect(employee.works_detail).toBeInstanceOf(Array);
        expect(employee).toHaveProperty('createdDate');
        expect(employee).toHaveProperty('updatedDate');
        expect(employee).toHaveProperty('deletedDate');
        expect(employee.deletedDate).toBeNull();

        expect(employee.works_detail).toBeInstanceOf(Array);
        expect(employee.works_detail.length).toBeGreaterThan(0);
      });
    });
  });

  describe('employees/find/certification/one/:id (GET)', () => {
    beforeAll(async () => {
      await authService.addPermission(
        userTest.id,
        'find_certification_employee',
      );
    });

    it('should throw an exception for not sending a JWT to the protected path employees/find/certification/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/find/certification/one/${falseEmployeeId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only one employee with certification', async () => {
      const record = (await seedService.CreateEmployee({})) as Employee;
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/find/certification/one/${record.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        authService.removePermission(userTest.id, 'create_employee'),
        authService.removePermission(userTest.id, 'find_all_employees'),
        authService.removePermission(userTest.id, 'find_one_employee'),
        authService.removePermission(userTest.id, 'update_one_employee'),
        authService.removePermission(userTest.id, 'remove_one_employee'),
        authService.removePermission(userTest.id, 'remove_bulk_employees'),

        authService.removePermission(
          userTest.id,
          'find_all_employees_with_pending_payments',
        ),
        authService.removePermission(
          userTest.id,
          'find_all_employees_with_made_payments',
        ),
        authService.removePermission(
          userTest.id,
          'find_all_employees_with_harvests',
        ),
        authService.removePermission(
          userTest.id,
          'find_all_employees_with_works',
        ),
        authService.removePermission(
          userTest.id,
          'find_certification_employee',
        ),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /employees/create', async () => {
      const bodyRequest: CreateEmployeeDto = {
        ...employeeDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/employees/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /employees/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/employees/update/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/employees/remove/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/employees/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/pending-payments/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/pending-payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/made-payments/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/made-payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/harvests/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/harvests/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/works/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/employees/works/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action employees/find/certification/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/employees/find/certification/one/${falseEmployeeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
