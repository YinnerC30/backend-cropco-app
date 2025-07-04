import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { WorkDetailsDto } from './dto/work-details.dto';
import { WorkDto } from './dto/work.dto';
import { Work } from './entities/work.entity';

import cookieParser from 'cookie-parser';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { TypeFilterDate } from 'src/common/enums/TypeFilterDate';
import { TypeFilterNumber } from 'src/common/enums/TypeFilterNumber';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TestAppModule } from 'src/testing/testing-e2e.module';

describe('WorksController (e2e)', () => {
  let app: INestApplication;

  let userTest: User;
  let token: string;
  let reqTools: RequestTools;
  let tenantId: string;

  const workDtoTemplete: WorkDto = {
    date: InformationGenerator.generateRandomDate({}),
    crop: { id: InformationGenerator.generateRandomId() },
    value_pay: 90_000,
    description: InformationGenerator.generateObservation(),
    details: [
      {
        employee: { id: InformationGenerator.generateRandomId() },
        value_pay: 90_000,
      } as WorkDetailsDto,
    ],
  };

  const falseWorkId = InformationGenerator.generateRandomId();

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

    await reqTools.clearDatabaseControlled({ works: true });

    userTest = await reqTools.createTestUser();
    token = await reqTools.generateTokenUser();
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('works/create (POST)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('create_work');
    });

    it('should throw an exception for not sending a JWT to the protected path /works/create', async () => {
      const bodyRequest: WorkDto = {
        ...workDtoTemplete,
      };
      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .send(bodyRequest)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new work', async () => {
      const crop = await reqTools.CreateCrop();
      const employee1 = await reqTools.CreateEmployee();
      const employee2 = await reqTools.CreateEmployee();

      const bodyRequest: WorkDto = {
        ...workDtoTemplete,
        crop: { id: crop.id },
        value_pay: 120_000,
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
          {
            employee: { id: employee2.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
        ],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);
      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'date must be a valid ISO 8601 date string',
        'description must be longer than or equal to 15 characters',
        'description must be a string',
        "The sum of fields [value_pay] in 'details' must match the corresponding top-level values.",
        'value_pay must be a positive number',
        'value_pay must be a number conforming to the specified constraints',
        'details should not be empty',
        'details must be an array',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });
  });

  describe('works/all (GET)', () => {
    let crop1: Crop;
    let crop2: Crop;
    let employee1: Employee;
    let employee2: Employee;
    beforeAll(async () => {
      await reqTools.clearDatabaseControlled({ works: true });
      await reqTools.addActionToUser('create_work');
      crop1 = (await reqTools.CreateCrop()) as Crop;
      crop2 = (await reqTools.CreateCrop()) as Crop;

      employee1 = (await reqTools.CreateEmployee()) as Employee;
      employee2 = (await reqTools.CreateEmployee()) as Employee;

      const data1: WorkDto = {
        date: InformationGenerator.generateRandomDate({}),
        crop: { id: crop1.id },
        value_pay: 60_000,
        description: InformationGenerator.generateDescription(),
        details: [
          {
            employee: { id: employee1.id },
            value_pay: 60_000,
          } as WorkDetailsDto,
        ],
      };

      const data2: WorkDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
        crop: { id: crop2.id },
        value_pay: 90_000,
        description: InformationGenerator.generateDescription(),
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 90_000,
          } as WorkDetailsDto,
        ],
      };
      const data3: WorkDto = {
        date: InformationGenerator.generateRandomDate({ daysToAdd: 10 }),
        crop: { id: crop2.id },
        value_pay: 180_000,
        description: InformationGenerator.generateDescription(),
        details: [
          {
            employee: { id: employee2.id },
            value_pay: 180_000,
          } as WorkDetailsDto,
        ],
      };

      for (let i = 0; i < 6; i++) {
        const result = await Promise.all([
          request
            .default(app.getHttpServer())
            .post('/works/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data1),
          request
            .default(app.getHttpServer())
            .post('/works/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data2),
          request
            .default(app.getHttpServer())
            .post('/works/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data3),
        ]);
      }
      await reqTools.addActionToUser('find_all_works');
    });

    it('should throw an exception for not sending a JWT to the protected path /works/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 works for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)

        .expect(200);
      expect(response.body.total_row_count).toEqual(18);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);
    });

    it('should return the specified number of works passed by the paging arguments by the URL', async () => {
      const response1 = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response1.body.total_row_count).toEqual(18);
      expect(response1.body.current_row_count).toEqual(11);
      expect(response1.body.total_page_count).toEqual(2);
      expect(response1.body.current_page_count).toEqual(1);
      response1.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });

      const response2 = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response2.body.total_row_count).toEqual(18);
      expect(response2.body.current_row_count).toEqual(7);
      expect(response2.body.total_page_count).toEqual(2);
      expect(response2.body.current_page_count).toEqual(2);
      response2.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ crop: crop2.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop2.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (includes crop)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ crop: crop1.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop1.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ employees: employee1.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee.id).toBe(employee1.id);
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of works passed by the query (includes employee)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query({ employees: employee2.id })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail.employee.id).toBe(employee2.id);
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of works passed by the query (after date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.AFTER,
        date: InformationGenerator.generateRandomDate({}),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(new Date(work.date) > new Date(queryData.date)).toBe(true);
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (before date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.BEFORE,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 1 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(new Date(work.date) < new Date(queryData.date)).toBe(true);
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (equal date)', async () => {
      const queryData = {
        filter_by_date: true,
        type_filter_date: TypeFilterDate.EQUAL,
        date: InformationGenerator.generateRandomDate({ daysToAdd: 5 }),
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work.date.split('T')[0]).toBe(
          new Date(queryData.date).toISOString().split('T')[0],
        );
        expect(work).toHaveProperty('value_pay');
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of works passed by the query (equal value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.EQUAL,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBe(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (max value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
        value_pay: 60_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeGreaterThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (min value_pay)', async () => {
      const queryData = {
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.LESS_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(12);
      expect(response.body.current_row_count).toEqual(10);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeLessThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });

    it('should return the specified number of works passed by the query (value_pay and crop 1)', async () => {
      const queryData = {
        crop: crop1.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.LESS_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(6);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(1);
      expect(response.body.current_page_count).toEqual(1);

      response.body.records.forEach((work: Work) => {
        expect(work).toHaveProperty('id');
        expect(work).toHaveProperty('date');
        expect(work).toHaveProperty('value_pay');
        expect(work.value_pay).toBeLessThan(queryData.value_pay);
        expect(work).toHaveProperty('description');
        expect(work).toHaveProperty('createdDate');
        expect(work).toHaveProperty('updatedDate');
        expect(work).toHaveProperty('deletedDate');
        expect(work.deletedDate).toBeNull();
        expect(work).toHaveProperty('crop');
        expect(work.crop).toBeDefined();
        expect(work.crop).toHaveProperty('id');
        expect(work.crop.id).toBe(crop1.id);
        expect(work.crop).toHaveProperty('name');
        expect(work).toHaveProperty('details');
        expect(work.details.length).toBeGreaterThan(0);
        work.details.forEach((detail) => {
          expect(detail).toHaveProperty('id');
          expect(detail).toHaveProperty('value_pay');
          expect(detail).toHaveProperty('payment_is_pending');
          expect(detail).toHaveProperty('employee');
          expect(detail.employee).toBeDefined();
          expect(detail.employee).toHaveProperty('id');
          expect(detail.employee).toHaveProperty('first_name');
          expect(detail.employee).toHaveProperty('last_name');
          expect(detail.employee).toHaveProperty('email');
          expect(detail.employee).toHaveProperty('cell_phone_number');
          expect(detail.employee).toHaveProperty('address');
        });
      });
    });
    it('should return the specified number of works passed by the query (value_pay and crop 2)', async () => {
      const queryData = {
        crop: crop2.id,
        filter_by_value_pay: true,
        type_filter_value_pay: TypeFilterNumber.GREATER_THAN,
        value_pay: 180_000,
      };
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/all`)
        .query(queryData)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      expect(response.body.total_row_count).toEqual(0);
      expect(response.body.current_row_count).toEqual(0);
      expect(response.body.total_page_count).toEqual(0);
      expect(response.body.current_page_count).toEqual(0);
    });

    describe('should return the specified number of works passed by the query mix filter', () => {
      beforeAll(async () => {
        const data1: WorkDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          crop: { id: crop1.id },
          value_pay: 360_000,
          description: InformationGenerator.generateDescription(),
          details: [
            {
              employee: { id: employee1.id },
              value_pay: 180_000,
            } as WorkDetailsDto,
            {
              employee: { id: employee2.id },
              value_pay: 180_000,
            } as WorkDetailsDto,
          ],
        };

        const data2: WorkDto = {
          date: InformationGenerator.generateRandomDate({ daysToAdd: 3 }),
          crop: { id: crop1.id },
          value_pay: 300_000,
          description: InformationGenerator.generateDescription(),
          details: [
            {
              employee: { id: employee1.id },
              value_pay: 150_000,
            } as WorkDetailsDto,
            {
              employee: { id: employee2.id },
              value_pay: 150_000,
            } as WorkDetailsDto,
          ],
        };

        await Promise.all([
          request
            .default(app.getHttpServer())
            .post('/works/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data1),
          request
            .default(app.getHttpServer())
            .post('/works/create')
            .set('x-tenant-id', tenantId)
            .set('Cookie', `user-token=${token}`)
            .send(data2),
        ]);
      });

      it('should return the specified number of works passed by the query (EQUAL 1 date , value_pay)', async () => {
        const queryData = {
          crop: crop2.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/works/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(0);
        expect(response.body.current_row_count).toEqual(0);
        expect(response.body.total_page_count).toEqual(0);
        expect(response.body.current_page_count).toEqual(0);
      });
      it('should return the specified number of works passed by the query (EQUAL 2 date, value_pay)', async () => {
        const queryData = {
          crop: crop1.id,
          filter_by_date: true,
          type_filter_date: TypeFilterDate.EQUAL,
          date: new Date(
            new Date().setDate(new Date().getDate() + 3),
          ).toISOString(),
          filter_by_value_pay: true,
          type_filter_value_pay: TypeFilterNumber.EQUAL,
          value_pay: 360_000,
        };
        const response = await request
          .default(app.getHttpServer())
          .get(`/works/all`)
          .query(queryData)
          .set('x-tenant-id', tenantId)
          .set('Cookie', `user-token=${token}`)
          .expect(200);

        expect(response.body.total_row_count).toEqual(1);
        expect(response.body.current_row_count).toEqual(1);
        expect(response.body.total_page_count).toEqual(1);
        expect(response.body.current_page_count).toEqual(1);

        response.body.records.forEach((work: Work) => {
          expect(work).toHaveProperty('id');
          expect(work.crop.id).toBe(crop1.id);
          expect(work).toHaveProperty('date');
          expect(work.date.split('T')[0]).toBe(
            new Date(queryData.date).toISOString().split('T')[0],
          );
          expect(work).toHaveProperty('value_pay');
          expect(work.value_pay).toBe(queryData.value_pay);
          expect(work.value_pay).toBe(queryData.value_pay);
          expect(work).toHaveProperty('description');
          expect(work).toHaveProperty('createdDate');
          expect(work).toHaveProperty('updatedDate');
          expect(work).toHaveProperty('deletedDate');
          expect(work.deletedDate).toBeNull();
          expect(work).toHaveProperty('crop');
          expect(work.crop).toBeDefined();
          expect(work.crop).toHaveProperty('id');
          expect(work.crop.id).toBe(crop1.id);
          expect(work.crop).toHaveProperty('name');
          expect(work).toHaveProperty('details');
          expect(work.details.length).toBeGreaterThan(0);
          work.details.forEach((detail) => {
            expect(detail).toHaveProperty('id');
            expect(detail).toHaveProperty('value_pay');
            expect(detail).toHaveProperty('payment_is_pending');
            expect(detail).toHaveProperty('employee');
            expect(detail.employee).toBeDefined();
            expect(detail.employee).toHaveProperty('id');
            expect(detail.employee).toHaveProperty('first_name');
            expect(detail.employee).toHaveProperty('last_name');
            expect(detail.employee).toHaveProperty('email');
            expect(detail.employee).toHaveProperty('cell_phone_number');
            expect(detail.employee).toHaveProperty('address');
          });
        });
      });
    });

    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no work records with the requested pagination',
      );
    });
  });

  describe('works/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('find_one_work');
    });

    it('should throw an exception for not sending a JWT to the protected path works/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one work', async () => {
      const record = (await reqTools.CreateWork()).work;

      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${record.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      const work = response.body;

      expect(work).toHaveProperty('id');
      expect(work).toHaveProperty('date');
      expect(work).toHaveProperty('value_pay');
      expect(work).toHaveProperty('description');
      expect(work).toHaveProperty('createdDate');
      expect(work).toHaveProperty('updatedDate');
      expect(work).toHaveProperty('deletedDate');
      expect(work.deletedDate).toBeNull();
      expect(work).toHaveProperty('crop');
      expect(work.crop).toBeDefined();
      expect(work.crop).toHaveProperty('id');
      expect(work.crop).toHaveProperty('name');
      expect(work).toHaveProperty('details');
      expect(work.details.length).toBeGreaterThan(0);
      work.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('payment_is_pending');
        expect(detail).toHaveProperty('employee');
        expect(detail.employee).toBeDefined();
        expect(detail.employee).toHaveProperty('id');
        expect(detail.employee).toHaveProperty('first_name');
        expect(detail.employee).toHaveProperty('last_name');
        expect(detail.employee).toHaveProperty('email');
        expect(detail.employee).toHaveProperty('cell_phone_number');
        expect(detail.employee).toHaveProperty('address');
      });
    });

    it('should throw exception for sending an invalid ID.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/works/one/1234`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });

    it('should throw exception for not finding work by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/works/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Work with id: ${falseWorkId} not found`);
    });

    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/works/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('works/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('update_one_work');
    });

    it('should throw an exception for not sending a JWT to the protected path works/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one work', async () => {
      const record = (await reqTools.CreateWork()).work;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const bodyRequest: WorkDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          value_pay: detail.value_pay + 2000,
        })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${record.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(200);

      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('date');
      expect(body).toHaveProperty('value_pay');
      expect(body.value_pay).toBe(bodyRequest.value_pay);
      expect(body).toHaveProperty('description');
      expect(body.description).toBe(bodyRequest.description);
      expect(body).toHaveProperty('createdDate');
      expect(body).toHaveProperty('updatedDate');
      expect(body).toHaveProperty('deletedDate');
      expect(body.deletedDate).toBeNull();
      expect(body).toHaveProperty('crop');
      expect(body.crop).toBeDefined();
      expect(body.crop).toHaveProperty('id');
      expect(body.crop).toHaveProperty('name');
      expect(body).toHaveProperty('details');
      expect(body.details.length).toBeGreaterThan(0);
      body.details.forEach((detail) => {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('value_pay');
        expect(detail).toHaveProperty('payment_is_pending');
        expect(detail).toHaveProperty('employee');
        expect(detail.employee).toBeDefined();
        expect(detail.employee).toHaveProperty('id');
        expect(detail.employee).toHaveProperty('first_name');
        expect(detail.employee).toHaveProperty('last_name');
        expect(detail.employee).toHaveProperty('email');
        expect(detail.employee).toHaveProperty('cell_phone_number');
        expect(detail.employee).toHaveProperty('address');
      });
    });

    it(' should throw an exception for trying to delete a record that is already paid for.', async () => {
      const record = (await reqTools.CreateWork({ quantityEmployees: 2 })).work;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      const idWorkDetail = record.details[0].id;

      await reqTools.CreatePayment({
        employeeId: record.details[0].employee.id,
        worksId: [record.details[0].id],
        valuePay: record.details[0].value_pay,
      });

      const bodyRequest: WorkDto = {
        ...rest,
        value_pay: 60_000,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details
          .filter((detail) => detail.id !== idWorkDetail)
          .map((detail) => ({
            id: detail.id,
            employee: { id: detail.employee.id },
            value_pay: 60_000,
          })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${record.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot delete the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );
    });

    // it('You should throw an exception for attempting to delete a record that has been cascaded out.', async () => {
    //   const record = (await seedService.CreateWork({ quantityEmployees: 2 }))
    //     .work;

    //   const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

    //   const idWorkDetail = record.details[0].id;

    //   await workDetailsRepository.softDelete(idWorkDetail);

    //   const bodyRequest: WorkDto = {
    //     ...rest,
    //     value_pay: 60_000,
    //     crop: { id: rest.crop.id },
    //     description: 'Observation updated',
    //     details: record.details
    //       .filter((detail) => detail.id !== idWorkDetail)
    //       .map((detail) => ({
    //         id: detail.id,
    //         employee: { id: detail.employee.id },
    //         value_pay: 60_000,
    //       })) as WorkDetailsDto[],
    //   };

    //   const { body } = await request
    //     .default(app.getHttpServer())
    //     .put(`/works/update/one/${record.id}`)
    //     .set('x-tenant-id', tenantId)
    //     .set('Cookie', `user-token=${token}`)
    //     .send(bodyRequest)
    //     .expect(400);

    //   expect(body.message).toBe(
    //     `You cannot delete the record with id ${record.details[0].id} , it is linked to other records.`,
    //   );
    // });

    it('should throw an exception for trying to modify a record that is already paid for.', async () => {
      const record = (await reqTools.CreateWork({ quantityEmployees: 2 })).work;

      const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

      await reqTools.CreatePayment({
        employeeId: record.details[0].employee.id,
        worksId: [record.details[0].id],
        valuePay: record.details[0].value_pay,
      });

      const bodyRequest: WorkDto = {
        ...rest,
        value_pay: rest.value_pay + 2000 * record.details.length,
        crop: { id: rest.crop.id },
        description: 'Observation updated',
        details: record.details.map((detail) => ({
          id: detail.id,
          employee: { id: detail.employee.id },
          value_pay: detail.value_pay + 2000,
        })) as WorkDetailsDto[],
      };

      const { body } = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${record.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);

      expect(body.message).toBe(
        `You cannot update the record with id ${record.details[0].id} , it is linked to a payment record.`,
      );

      // await workDetailsRepository.update(record.details[0].id, {
      //   payment_is_pending: true,
      // });
    });

    // it('You should throw an exception for attempting to modify a record that has been cascaded out.', async () => {
    //   const record = (await seedService.CreateWork({ quantityEmployees: 2 }))
    //     .work;

    //   const { id, createdDate, updatedDate, deletedDate, ...rest } = record;

    //   await workDetailsRepository.softDelete(record.details[0].id);

    //   const bodyRequest: WorkDto = {
    //     ...rest,
    //     value_pay: rest.value_pay + 2000 * record.details.length,
    //     crop: { id: rest.crop.id },
    //     description: 'Observation updated',
    //     details: record.details.map((detail) => ({
    //       id: detail.id,
    //       employee: { id: detail.employee.id },
    //       value_pay: detail.value_pay + 2000,
    //     })) as WorkDetailsDto[],
    //   };

    //   const { body } = await request
    //     .default(app.getHttpServer())
    //     .put(`/works/update/one/${record.id}`)
    //     .set('x-tenant-id', tenantId)
    //     .set('Cookie', `user-token=${token}`)
    //     .send(bodyRequest)
    //     .expect(400);

    //   expect(body.message).toBe(
    //     `You cannot update the record with id ${record.details[0].id} , it is linked to other records.`,
    //   );
    // });

    it('should throw exception for not finding work to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(workDtoTemplete)
        .expect(404);
      expect(body.message).toEqual(`Work with id: ${falseWorkId} not found`);
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
  });

  describe('works/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_one_work');
    });

    it('should throw an exception for not sending a JWT to the protected path works/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one work', async () => {
      const { id } = (await reqTools.CreateWork({ quantityEmployees: 2 })).work;

      await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const work = await workRepository.findOne({ where: { id } });
      // expect(work).toBeNull();
    });

    it('You should throw exception for trying to delete a work that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Work with id: ${falseWorkId} not found`);
    });

    it('should throw an exception when trying to delete a work with payments records', async () => {
      const work = (await reqTools.CreateWork({})).work;

      await reqTools.CreatePayment({
        employeeId: work.details[0].employee.id,
        worksId: [work.details[0].id],
        valuePay: work.details[0].value_pay,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${work.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(409);

      expect(body.message).toEqual(
        `The record with id ${work.id} cannot be deleted because it has payments linked to it.`,
      );
    });
  });

  describe('works/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_bulk_works');
    });

    it('should throw an exception for not sending a JWT to the protected path works/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete works bulk', async () => {
      const [{ work: work1 }, { work: work2 }, { work: work3 }] =
        await Promise.all([
          reqTools.CreateWork({}),
          reqTools.CreateWork({}),
          reqTools.CreateWork({}),
        ]);

      const bulkData: RemoveBulkRecordsDto<Work> = {
        recordsIds: [{ id: work1.id }, { id: work2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bulkData)
        .expect(200);

      // const [deletedWork1, deletedWork2, remainingWork3] = await Promise.all([
      //   workRepository.findOne({ where: { id: work1.id } }),
      //   workRepository.findOne({ where: { id: work2.id } }),
      //   workRepository.findOne({ where: { id: work3.id } }),
      // ]);

      // expect(deletedWork1).toBeNull();
      // expect(deletedWork2).toBeNull();
      // expect(remainingWork3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw a multi-state code when trying to delete a work with payment records and other unrestricted records.', async () => {
      const [{ work: work1 }, { work: work2 }, { work: work3 }] =
        await Promise.all([
          reqTools.CreateWork({}),
          reqTools.CreateWork({}),
          reqTools.CreateWork({}),
        ]);

      await reqTools.CreatePayment({
        employeeId: work1.details[0].employee.id,
        worksId: [work1.details[0].id],
        valuePay: work1.details[0].value_pay,
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/bulk`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          recordsIds: [{ id: work1.id }, { id: work2.id }, { id: work3.id }],
        })
        .expect(207);
      expect(body).toEqual({
        success: [work2.id, work3.id],
        failed: [
          {
            id: work1.id,
            error: `The record with id ${work1.id} cannot be deleted because it has payments linked to it.`,
          },
        ],
      });
    });
  });

  describe('works/export/one/pdf/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('export_work_to_pdf');
    });

    it('should throw an exception for not sending a JWT to the protected path works/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/export/one/pdf/:id')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should export one work in PDF format', async () => {
      const record = (await reqTools.CreateWork()).work;
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/export/one/pdf/${record.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body).toBeDefined();
      expect(response.headers['content-type']).toEqual('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'create_work'),
        reqTools.removePermissionFromUser(userTest.id, 'find_all_works'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_work'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_work'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_work'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_works'),
        reqTools.removePermissionFromUser(userTest.id, 'export_work_to_pdf'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /works/create', async () => {
      await reqTools.removePermissionFromUser(userTest.id, 'create_work');
      const bodyRequest: WorkDto = {
        ...workDtoTemplete,
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/works/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /works/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/works/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .put(`/works/update/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/works/remove/one/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/works/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action works/export/one/pdf/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/works/export/one/pdf/${falseWorkId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
