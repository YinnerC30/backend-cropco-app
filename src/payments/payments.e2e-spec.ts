import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { AuthService } from 'src/auth/auth.service';
import { CommonModule } from 'src/common/common.module';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { SeedModule } from 'src/seed/seed.module';
import { SeedService } from 'src/seed/seed.service';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { DeepPartial, Repository } from 'typeorm';
import { MethodOfPayment, Payment } from './entities/payment.entity';

import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { Employee } from 'src/employees/entities/employee.entity';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { PaymentDto } from './dto/payment.dto';
import { PaymentsHarvest } from './entities/payment-harvest.entity';
import { PaymentsWork } from './entities/payment-work.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsModule } from './payments.module';

describe('PaymentsController (e2e)', () => {
  let app: INestApplication;
  let paymentRepository: Repository<Payment>;
  let paymentsHarvestRepository: Repository<PaymentsHarvest>;
  let paymentsWorkRepository: Repository<PaymentsWork>;
  let seedService: SeedService;
  let authService: AuthService;

  let paymentController: PaymentsController;
  let userTest: User;
  let token: string;

  const paymentDtoTemplete: PaymentDto = {
    date: InformationGenerator.generateRandomDate(),
    value_pay: 90_000,
    employee: { id: InformationGenerator.generateRandomId() },
    method_of_payment: MethodOfPayment.EFECTIVO,
    categories: {
      harvests: [],
      works: [],
    },
  };

  const falsePaymentId = InformationGenerator.generateRandomId();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        PaymentsModule,
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
    paymentController =
      moduleFixture.get<PaymentsController>(PaymentsController);

    paymentRepository = moduleFixture.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    paymentsHarvestRepository = moduleFixture.get<Repository<PaymentsHarvest>>(
      getRepositoryToken(PaymentsHarvest),
    );
    paymentsWorkRepository = moduleFixture.get<Repository<PaymentsWork>>(
      getRepositoryToken(PaymentsWork),
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

    await paymentRepository.delete({});
    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  describe('payments/create (POST)', () => {
    it('should throw an exception for not sending a JWT to the protected path /payments/create', async () => {
      const bodyRequest: PaymentDto = {
        ...paymentDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/payments/create')
        .send(bodyRequest)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /payments/create', async () => {
      await authService.removePermission(userTest.id, 'create_payment');

      const bodyRequest: PaymentDto = {
        ...paymentDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/payments/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should create a new payment', async () => {
      await authService.addPermission(userTest.id, 'create_payment');

      const { employees, harvest } = await seedService.CreateHarvest({});
      const { work } = await seedService.CreateWorkForEmployee({
        employeeId: employees[0].id,
      });

      const totalValuePay =
        harvest.details[0].value_pay + work.details[0].value_pay;

      const bodyRequest: PaymentDto = {
        ...paymentDtoTemplete,
        employee: { id: employees[0].id },
        value_pay: totalValuePay,
        categories: {
          harvests: [harvest.details[0].id] as DeepPartial<HarvestDetails>[],
          works: [work.details[0].id] as DeepPartial<WorkDetails>[],
        },
      };

      await request
        .default(app.getHttpServer())
        .post('/payments/create')
        .set('Authorization', `Bearer ${token}`)
        .send(bodyRequest)
        .expect(201);

      for (const harvestId of bodyRequest.categories.harvests) {
        const { harvests_detail } = await paymentsHarvestRepository.findOne({
          where: { harvests_detail: { id: harvestId as any } },
          relations: {
            harvests_detail: true,
          },
        });

        expect(harvests_detail.payment_is_pending).toBe(false);
      }

      for (const workId of bodyRequest.categories.works) {
        const { works_detail } = await paymentsWorkRepository.findOne({
          where: { works_detail: { id: workId as any } },
          relations: {
            works_detail: true,
          },
        });

        expect(works_detail.payment_is_pending).toBe(false);
      }
    });

    it('should throw exception when fields are missing in the body', async () => {
      await authService.addPermission(userTest.id, 'create_payment');
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'employee should not be null or undefined',
        'method_of_payment must be one of the following values: EFECTIVO, TRANSFERENCIA, INTERCAMBIO',
        'method_of_payment must be a string',
        'value_pay must be a positive number',
        'value_pay must be an integer number',
        'categories should not be empty',
        "At least one of the 'harvests' or 'works' fields must contain values in 'categories'.",
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/payments/create')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('payments/all (GET)', () => {
    let employeesHarvest: Employee[];
    let employeesWork: Employee[];

    beforeEach(async () => {
      await authService.addPermission(userTest.id, 'find_all_payments');
    });
    afterEach(async () => {
      await authService.removePermission(userTest.id, 'find_all_payments');
    });

    beforeAll(async () => {
      await paymentRepository.delete({});

      const resultHarvest = await seedService.CreateHarvest({
        quantityEmployees: 9,
      });
      const resultWork = await seedService.CreateWork({ quantityEmployees: 9 });

      employeesHarvest = [...resultHarvest.employees];
      employeesWork = [...resultWork.employees];

      for (let i = 0; i < 9; i++) {
        await Promise.all([
          await seedService.CreatePayment({
            employeeId: employeesHarvest[i].id,
            worksId: [],
            harvestsId: [resultHarvest.harvest.details[i].id],
            value_pay: resultHarvest.harvest.details[i].value_pay,
          }),
          await seedService.CreatePayment({
            datePayment: InformationGenerator.generateRandomDate(1),
            employeeId: employeesWork[i].id,
            worksId: [resultWork.work.details[i].id],
            harvestsId: [],
            value_pay: resultWork.work.details[i].value_pay,
          }),
        ]);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /payments/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payments/all')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action /payments/all', async () => {
      await authService.removePermission(userTest.id, 'find_all_payments');

      const response = await request
        .default(app.getHttpServer())
        .get('/payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get only 10 payments for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payments/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of payments passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query({ limit: 11, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query({ limit: 11, offset: 1 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(7);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query({ employee: employeesHarvest[0].id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(1);
      expect(response.body.current_row_count).toEqual(1);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query({ employee: employeesWork[0].id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(1);
      expect(response.body.current_row_count).toEqual(1);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate(),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(9);
      expect(response.body.current_row_count).toEqual(9);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate(1),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(9);
      expect(response.body.current_row_count).toEqual(9);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate(),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(9);
      expect(response.body.current_row_count).toEqual(9);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    it('should return the specified number of payments passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 90_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });
    it('should return the specified number of payments passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MAX,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });
    it('should return the specified number of payments passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.MIN,
        value_pay: 100_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/all`)
        .query(queryData)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((payment: Payment) => {
        expect(payment).toHaveProperty('id');
        expect(payment).toHaveProperty('date');
        expect(payment).toHaveProperty('value_pay');
        expect(payment).toHaveProperty('employee');
        expect(payment.employee).toBeDefined();
        expect(payment.employee).toHaveProperty('id');
        expect(payment.employee).toHaveProperty('first_name');
        expect(payment.employee).toHaveProperty('last_name');
        expect(payment.employee).toHaveProperty('email');
        expect(payment.employee).toHaveProperty('cell_phone_number');
        expect(payment.employee).toHaveProperty('address');
        expect(payment).toHaveProperty('createdDate');
        expect(payment).toHaveProperty('updatedDate');
        expect(payment).toHaveProperty('deletedDate');
        expect(payment.deletedDate).toBeNull();
        expect(payment).toHaveProperty('payments_harvest');
        expect(payment.payments_harvest).toBeInstanceOf(Array);
        expect(payment).toHaveProperty('payments_work');
        expect(payment.payments_work).toBeInstanceOf(Array);
      });
    });

    describe('should return the specified number of payments passed by the query mix filter', () => {
      let employee3: Employee;
      let employee4: Employee;
      beforeAll(async () => {
        const resultHarvest = await seedService.CreateHarvest({
          quantityEmployees: 1,
          valuePay: 120_000,
        });

        employee3 = { ...resultHarvest.employees[0] };

        const resultWork = await seedService.CreateWork({
          quantityEmployees: 1,
          valuePay: 115_000,
        });

        employee4 = { ...resultWork.employees[0] };

        await Promise.all([
          await seedService.CreatePayment({
            employeeId: resultHarvest.employees[0].id,
            worksId: [],
            harvestsId: [resultHarvest.harvest.details[0].id],
            value_pay: resultHarvest.harvest.details[0].value_pay,
          }),
          await seedService.CreatePayment({
            datePayment: InformationGenerator.generateRandomDate(1),
            employeeId: resultWork.employees[0].id,
            worksId: [resultWork.work.details[0].id],
            harvestsId: [],
            value_pay: resultWork.work.details[0].value_pay,
          }),
        ]);
      });

      it('should return the specified number of payments passed by the query (MAX value_pay , employee)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MAX,
          value_pay: 115_000,
          employee: employee3.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/payments/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((payment: Payment) => {
          expect(payment).toHaveProperty('id');
          expect(payment).toHaveProperty('date');
          expect(payment).toHaveProperty('value_pay');
          expect(payment).toHaveProperty('employee');
          expect(payment.employee).toBeDefined();
          expect(payment.employee).toHaveProperty('id');
          expect(payment.employee).toHaveProperty('first_name');
          expect(payment.employee).toHaveProperty('last_name');
          expect(payment.employee).toHaveProperty('email');
          expect(payment.employee).toHaveProperty('cell_phone_number');
          expect(payment.employee).toHaveProperty('address');
          expect(payment).toHaveProperty('createdDate');
          expect(payment).toHaveProperty('updatedDate');
          expect(payment).toHaveProperty('deletedDate');
          expect(payment.deletedDate).toBeNull();
          expect(payment).toHaveProperty('payments_harvest');
          expect(payment.payments_harvest).toBeInstanceOf(Array);
          expect(payment).toHaveProperty('payments_work');
          expect(payment.payments_work).toBeInstanceOf(Array);
        });
      });
      it('should return the specified number of payments passed by the query (MIN value_pay , employee)', async () => {
        const queryData = {
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.MIN,
          value_pay: 120_000,
          employee: employee4.id,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/payments/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((payment: Payment) => {
          expect(payment).toHaveProperty('id');
          expect(payment).toHaveProperty('date');
          expect(payment).toHaveProperty('value_pay');
          expect(payment).toHaveProperty('employee');
          expect(payment.employee).toBeDefined();
          expect(payment.employee).toHaveProperty('id');
          expect(payment.employee).toHaveProperty('first_name');
          expect(payment.employee).toHaveProperty('last_name');
          expect(payment.employee).toHaveProperty('email');
          expect(payment.employee).toHaveProperty('cell_phone_number');
          expect(payment.employee).toHaveProperty('address');
          expect(payment).toHaveProperty('createdDate');
          expect(payment).toHaveProperty('updatedDate');
          expect(payment).toHaveProperty('deletedDate');
          expect(payment.deletedDate).toBeNull();
          expect(payment).toHaveProperty('payments_harvest');
          expect(payment.payments_harvest).toBeInstanceOf(Array);
          expect(payment).toHaveProperty('payments_work');
          expect(payment.payments_work).toBeInstanceOf(Array);
        });
      });

      it('should return the specified number of payments passed by the query (EQUAL date, value_pay , amount)', async () => {
        const queryData = {
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: InformationGenerator.generateRandomDate(3),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/payments/all`)
          .query(queryData)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(0);
        expect(response.body.current_row_count).toEqual(0);
        expect(response.body.total_page_count).toEqual(0);
        expect(response.body.current_page_count).toEqual(0);
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/payments/all')
        .query({ offset: 10 })
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no payment records with the requested pagination',
      );
    });
  });

  describe('payments/one/:id (GET)', () => {
    beforeEach(async () => {
      await authService.addPermission(userTest.id, 'find_one_payment');
    });
    afterEach(async () => {
      await authService.removePermission(userTest.id, 'find_one_payment');
    });

    it('should throw an exception for not sending a JWT to the protected path payments/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/one/${falsePaymentId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action payments/one/:id', async () => {
      await authService.removePermission(userTest.id, 'find_one_payment');
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/one/${falsePaymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should get one payment', async () => {
      const resultHarvest = await seedService.CreateHarvest({
        quantityEmployees: 1,
        valuePay: 120_000,
      });

      const { id } = await seedService.CreatePayment({
        employeeId: resultHarvest.employees[0].id,
        worksId: [],
        harvestsId: [resultHarvest.harvest.details[0].id],
        value_pay: resultHarvest.harvest.details[0].value_pay,
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const payment = response.body;

      expect(payment).toHaveProperty('id');
      expect(payment).toHaveProperty('date');
      expect(payment).toHaveProperty('value_pay');
      expect(payment).toHaveProperty('employee');
      expect(payment.employee).toBeDefined();
      expect(payment.employee).toHaveProperty('id');
      expect(payment.employee).toHaveProperty('first_name');
      expect(payment.employee).toHaveProperty('last_name');
      expect(payment.employee).toHaveProperty('email');
      expect(payment.employee).toHaveProperty('cell_phone_number');
      expect(payment.employee).toHaveProperty('address');
      expect(payment).toHaveProperty('createdDate');
      expect(payment).toHaveProperty('updatedDate');
      expect(payment).toHaveProperty('deletedDate');
      expect(payment.deletedDate).toBeNull();
      expect(payment).toHaveProperty('payments_harvest');
      expect(payment.payments_harvest).toBeInstanceOf(Array);
      expect(payment).toHaveProperty('payments_work');
      expect(payment.payments_work).toBeInstanceOf(Array);
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/payments/one/1234`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding payment by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/payments/one/${falsePaymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Payment with id: ${falsePaymentId} not found`,
      );
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/payments/one/`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('payments/remove/one/:id (DELETE)', () => {
    beforeEach(async () => {
      await authService.addPermission(userTest.id, 'remove_one_payment');
    });
    afterEach(async () => {
      await authService.removePermission(userTest.id, 'remove_one_payment');
    });
    it('should throw an exception for not sending a JWT to the protected path payments/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/payments/remove/one/${falsePaymentId}`)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action payments/remove/one/:id', async () => {
      await authService.removePermission(userTest.id, 'remove_one_payment');
      const response = await request
        .default(app.getHttpServer())
        .delete(`/payments/remove/one/${falsePaymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete one payment', async () => {
      const resultHarvest = await seedService.CreateHarvest({
        quantityEmployees: 1,
        valuePay: 120_000,
      });

      const { id } = await seedService.CreatePayment({
        employeeId: resultHarvest.employees[0].id,
        worksId: [],
        harvestsId: [resultHarvest.harvest.details[0].id],
        value_pay: resultHarvest.harvest.details[0].value_pay,
      });

      await request
        .default(app.getHttpServer())
        .delete(`/payments/remove/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await authService.addPermission(userTest.id, 'find_one_payment');

      const { notFound } = await request
        .default(app.getHttpServer())
        .get(`/payments/one/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(notFound).toBe(true);
    });

    it('You should throw exception for trying to delete a payment that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/payments/remove/one/${falsePaymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      expect(body.message).toEqual(
        `Payment with id: ${falsePaymentId} not found`,
      );
    });
  });

  describe('payments/remove/bulk (DELETE)', () => {
    beforeEach(async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_payments');
    });
    afterEach(async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_payments');
    });
    it('should throw an exception for not sending a JWT to the protected path payments/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/payments/remove/bulk')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action payments/remove/bulk ', async () => {
      await authService.removePermission(userTest.id, 'remove_bulk_payments');
      const response = await request
        .default(app.getHttpServer())
        .delete('/payments/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should delete payments bulk', async () => {
      await authService.addPermission(userTest.id, 'remove_bulk_payments');

      const resultHarvest = await seedService.CreateHarvest({
        quantityEmployees: 3,
        valuePay: 120_000,
      });

      const [payment1, payment2, payment3] = await Promise.all([
        await seedService.CreatePayment({
          employeeId: resultHarvest.employees[0].id,
          worksId: [],
          harvestsId: [resultHarvest.harvest.details[0].id],
          value_pay: resultHarvest.harvest.details[0].value_pay,
        }),
        await seedService.CreatePayment({
          employeeId: resultHarvest.employees[1].id,
          worksId: [],
          harvestsId: [resultHarvest.harvest.details[1].id],
          value_pay: resultHarvest.harvest.details[1].value_pay,
        }),
        await seedService.CreatePayment({
          employeeId: resultHarvest.employees[2].id,
          worksId: [],
          harvestsId: [resultHarvest.harvest.details[2].id],
          value_pay: resultHarvest.harvest.details[2].value_pay,
        }),
      ]);

      const bulkData: RemoveBulkRecordsDto<Payment> = {
        recordsIds: [{ id: payment1.id }, { id: payment2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/payments/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send(bulkData)
        .expect(200);

      const [deletedPayment1, deletedPayment2, remainingPayment3] =
        await Promise.all([
          paymentRepository.findOne({ where: { id: payment1.id } }),
          paymentRepository.findOne({ where: { id: payment2.id } }),
          paymentRepository.findOne({ where: { id: payment3.id } }),
        ]);

      expect(deletedPayment1).toBeNull();
      expect(deletedPayment2).toBeNull();
      expect(remainingPayment3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/payments/remove/bulk')
        .set('Authorization', `Bearer ${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });
  });

  describe('payments/export/one/pdf/:id (GET)', () => {
    beforeEach(async () => {
      await authService.addPermission(userTest.id, 'export_payment_to_pdf');
    });
    afterEach(async () => {
      await authService.removePermission(userTest.id, 'export_payment_to_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path payments/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/payments/export/one/pdf/:id')
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should throw an exception because the user JWT does not have permissions for this action payments/export/one/pdf/:id', async () => {
      await authService.removePermission(userTest.id, 'export_payment_to_pdf');
      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/export/one/pdf/${falsePaymentId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should export one payment in PDF format', async () => {
      const resultHarvest = await seedService.CreateHarvest({
        quantityEmployees: 1,
        valuePay: 120_000,
      });

      const { id } = await seedService.CreatePayment({
        employeeId: resultHarvest.employees[0].id,
        worksId: [],
        harvestsId: [resultHarvest.harvest.details[0].id],
        value_pay: resultHarvest.harvest.details[0].value_pay,
      });

      const response = await request
        .default(app.getHttpServer())
        .get(`/payments/export/one/pdf/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });
});
