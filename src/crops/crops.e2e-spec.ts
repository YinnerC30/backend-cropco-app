import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from 'src/users/entities/user.entity';
import * as request from 'supertest';
import { CreateCropDto } from './dto/create-crop.dto';
import { Crop } from './entities/crop.entity';

import cookieParser from 'cookie-parser';
import { RemoveBulkRecordsDto } from 'src/common/dto/remove-bulk-records.dto';
import { InformationGenerator } from 'src/seed/helpers/InformationGenerator';
import { RequestTools } from 'src/seed/helpers/RequestTools';
import { TestAppModule } from 'src/testing/testing-e2e.module';

describe('CropsController e2e', () => {
  let app: INestApplication;
  let userTest: User;
  let token: string;
  let reqTools: RequestTools;
  let tenantId: string;

  const cropDtoTemplete: CreateCropDto = {
    name: 'Crop' + InformationGenerator.generateRandomId(),
    description: InformationGenerator.generateDescription(),
    units: 1000,
    number_hectares: 10,
    location: InformationGenerator.generateAddress(),
    date_of_creation: InformationGenerator.generateRandomDate({}),
  } as CreateCropDto;

  const falseCropId = InformationGenerator.generateRandomId();

  const CreateCrop = async () => {
    const crop = (await reqTools.createSeedData({ crops: 1 })).history
      .insertedCrops[0];

    const cropMapper = {
      id: crop.id,
      name: crop.name,
      description: crop.description,
      number_hectares: crop.number_hectares,
      units: crop.units,
      location: crop.location,
      date_of_creation: crop.date_of_creation,
      date_of_termination: crop.date_of_termination,
    };
    return cropMapper;
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

    try {
      reqTools = new RequestTools({ moduleFixture });
      reqTools.setApp(app);
      await reqTools.initializeTenant();
      tenantId = reqTools.getTenantIdPublic();

      await reqTools.clearDatabaseControlled({ crops: true });

      userTest = await reqTools.createTestUser();
      token = await reqTools.generateTokenUser();
    } catch (error) {
      console.error(error);
    }
  });

  afterAll(async () => {
    await reqTools.deleteTestUser();
    await app.close();
  });

  describe('crops/all (GET)', () => {
    beforeAll(async () => {
      try {
        await reqTools.clearDatabaseControlled({ crops: true });
        await Promise.all(Array.from({ length: 17 }).map(() => CreateCrop()));
        await reqTools.addActionToUser('find_all_crops');
      } catch (error) {
        console.log(error);
      }
    });

    it('should throw an exception for not sending a JWT to the protected path /crops/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get only 10 crops for default by not sending paging parameters', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
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
        .get('/crops/all')
        .query({ all_records: true, limit: 10, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(17);
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
        expect(crop).toHaveProperty('createdDate');
        expect(crop).toHaveProperty('updatedDate');
        expect(crop).toHaveProperty('deletedDate');
        expect(crop.deletedDate).toBeNull();
      });
    });
    it('should return the specified number of crops passed by the paging arguments by the URL (1)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/all`)
        .query({ limit: 11, offset: 0 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(11);
      expect(response.body.total_page_count).toEqual(2);
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
    it('should return the specified number of crops passed by the paging arguments by the URL (2)', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/all`)
        .query({ limit: 11, offset: 1 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);
      expect(response.body.total_row_count).toEqual(17);
      expect(response.body.current_row_count).toEqual(6);
      expect(response.body.total_page_count).toEqual(2);
      expect(response.body.current_page_count).toEqual(2);
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
    it('You should throw an exception for requesting out-of-scope paging.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .query({ offset: 10 })
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(
        'There are no crop records with the requested pagination',
      );
    });
  });

  describe('crops/create (POST)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('create_crop');
    });

    it('should throw an exception for not sending a JWT to the protected path /crops/create', async () => {
      const bodyRequest = {
        ...cropDtoTemplete,
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .send(bodyRequest)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should create a new crop', async () => {
      const bodyRequest = {
        ...cropDtoTemplete,
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(201);

      expect(response.body).toMatchObject(bodyRequest);
    });

    it('should throw exception when fields are missing in the body', async () => {
      const errorMessage = [
        'name must be longer than or equal to 4 characters',
        'name must be a string',
        'number_hectares must be a positive number',
        'number_hectares must be a number conforming to the specified constraints',
        'units must not be less than 1',
        'units must be a number conforming to the specified constraints',
        'location must be longer than or equal to 15 characters',
        'location must be a string',
        'date_of_creation must be a valid ISO 8601 date string',
      ];

      const { body } = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);

      errorMessage.forEach((msg) => {
        expect(body.message).toContain(msg);
      });
    });

    it('should throw exception for trying to create a crop with duplicate name.', async () => {
      const cropWithSameName = await CreateCrop();

      const bodyRequest: CreateCropDto = {
        ...cropDtoTemplete,
        name: cropWithSameName.name,
      } as CreateCropDto;

      const { body } = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${bodyRequest.name}) already exists.`,
      );
    });
  });

  describe('crops/one/:id (GET)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('find_one_crop');
    });

    it('should throw an exception for not sending a JWT to the protected path crops/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should get one crop', async () => {
      const { id } = await CreateCrop();

      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
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
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(400);
      expect(body.message).toEqual('Validation failed (uuid is expected)');
    });
    it('should throw exception for not finding crop by ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Crop with id: ${falseCropId} not found`);
    });
    it('should throw exception for not sending an ID', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .get(`/crops/one/`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.error).toEqual('Not Found');
    });
  });

  describe('crops/update/one/:id (PATCH)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('update_one_crop');
    });

    it('should throw an exception for not sending a JWT to the protected path crops/update/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should update one crop', async () => {
      const crop = await CreateCrop();

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${crop.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          description: 'Change description crop',
          location: 'Change location crop',
        })
        .expect(200);

      expect(body.description).toEqual('Change description crop');
      expect(body.location).toEqual('Change location crop');
      expect(body.name).toEqual(crop.name);
      expect(body.units).toEqual(crop.units);
      expect(body.date_of_creation).toEqual(
        crop.date_of_creation.split('T')[0],
      );
    });

    it('should throw exception for not finding crop to update', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ location: 'New location random with errors' })
        .expect(404);
      expect(body.message).toEqual(`Crop with id: ${falseCropId} not found`);
    });

    it('should throw exception for sending incorrect properties', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ year: 2025 })
        .expect(400);
      expect(body.message).toContain('property year should not exist');
    });
    it('should throw exception for trying to update the name for one that is in use.', async () => {
      const cropWithSameName = await CreateCrop();
      const crop = await CreateCrop();

      const bodyRequest = {
        name: cropWithSameName.name,
      };

      const { body } = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${crop.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(400);
      expect(body.message).toEqual(
        `Unique constraint violation, Key (name)=(${bodyRequest.name}) already exists.`,
      );
    });
  });

  describe('crops/remove/one/:id (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_one_crop');
    });

    it('should throw an exception for not sending a JWT to the protected path crops/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete one crop', async () => {
      const crop = await CreateCrop();

      await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${crop.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(200);

      // const deletedCrop = await cropRepository.findOne({
      //   where: { id: crop.id },
      // });
      // expect(deletedCrop).toBeNull();
    });

    it('You should throw exception for trying to delete a crop that does not exist.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(404);
      expect(body.message).toEqual(`Crop with id: ${falseCropId} not found`);
    });

    it('should throw an exception when trying to delete a crop with stock available', async () => {
      const { history } = await reqTools.createSeedData({
        harvests: { quantity: 1, variant: 'normal' },
      });
      const [record1] = history.insertedHarvests;

      await reqTools.createSeedData({
        harvestsProcessed: {
          quantity: 1,
          cropId: record1.crop.id,
          harvestId: record1.harvest.id,
        },
      });
      await reqTools.createSeedData({
        harvestsProcessed: {
          quantity: 1,
          cropId: record1.crop.id,
          harvestId: record1.harvest.id,
        },
      });

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${record1.crop.id}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(409);
      expect(body.message).toEqual(
        `Crop with id ${record1.crop.id} has stock available`,
      );
    });
  });

  describe('crops/remove/bulk (DELETE)', () => {
    beforeAll(async () => {
      await reqTools.addActionToUser('remove_bulk_crops');
    });

    it('should throw an exception for not sending a JWT to the protected path crops/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('x-tenant-id', tenantId)
        .expect(401);
      expect(response.body.message).toEqual('Unauthorized');
    });

    it('should delete crops bulk', async () => {
      const [crop1, crop2, crop3] = await Promise.all([
        await CreateCrop(),
        await CreateCrop(),
        await CreateCrop(),
      ]);

      const bulkData: RemoveBulkRecordsDto<Crop> = {
        recordsIds: [{ id: crop1.id }, { id: crop2.id }],
      };

      await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bulkData)
        .expect(200);

      // const [deletedClient1, deletedClient2, remainingClient3] =
      //   await Promise.all([
      //     cropRepository.findOne({ where: { id: crop1.id } }),
      //     cropRepository.findOne({ where: { id: crop2.id } }),
      //     cropRepository.findOne({ where: { id: crop3.id } }),
      //   ]);

      // expect(deletedClient1).toBeNull();
      // expect(deletedClient2).toBeNull();
      // expect(remainingClient3).toBeDefined();
    });

    it('should throw exception when trying to send an empty array.', async () => {
      const { body } = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({ recordsIds: [] })
        .expect(400);
      expect(body.message[0]).toEqual('recordsIds should not be empty');
    });

    it('should throw an exception when trying to delete a crop with stock available.', async () => {
      const { history } = await reqTools.createSeedData({
        harvests: { quantity: 2, variant: 'normal' },
      });
      const [record1, record2] = history.insertedHarvests;

      await reqTools.createSeedData({
        harvestsProcessed: {
          quantity: 1,
          cropId: record1.crop.id,
          harvestId: record1.harvest.id,
        },
      });
      await reqTools.createSeedData({
        harvestsProcessed: {
          quantity: 1,
          cropId: record2.crop.id,
          harvestId: record2.harvest.id,
        },
      });

      const crop3 = await CreateCrop();

      const { body } = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/bulk`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send({
          recordsIds: [
            { id: record1.crop.id },
            { id: record2.crop.id },
            { id: crop3.id },
          ],
        })
        .expect(207);
      expect(body).toEqual({
        success: [crop3.id],
        failed: [
          {
            id: record1.crop.id,
            error: `Crop with id ${record1.crop.id} has stock available`,
          },
          {
            id: record2.crop.id,
            error: `Crop with id ${record2.crop.id} has stock available`,
          },
        ],
      });
    });
  });

  describe('should throw an exception because the user JWT does not have permissions for these actions', () => {
    beforeAll(async () => {
      await Promise.all([
        reqTools.removePermissionFromUser(userTest.id, 'find_all_crops'),
        reqTools.removePermissionFromUser(userTest.id, 'create_crop'),
        reqTools.removePermissionFromUser(userTest.id, 'find_one_crop'),
        reqTools.removePermissionFromUser(userTest.id, 'update_one_crop'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_one_crop'),
        reqTools.removePermissionFromUser(userTest.id, 'remove_bulk_crops'),
      ]);
    });

    it('should throw an exception because the user JWT does not have permissions for this action /crops/all', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/crops/all')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action /crops/create', async () => {
      await reqTools.removePermissionFromUser(userTest.id, 'create_crop');

      const bodyRequest = {
        ...cropDtoTemplete,
      } as CreateCropDto;

      const response = await request
        .default(app.getHttpServer())
        .post('/crops/create')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .send(bodyRequest)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get(`/crops/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action crops/update/one/:id', async () => {
      await reqTools.removePermissionFromUser(userTest.id, 'find_one_crop');
      const response = await request
        .default(app.getHttpServer())
        .patch(`/crops/update/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
    it('should throw an exception because the user JWT does not have permissions for this action crops/remove/one/:id', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete(`/crops/remove/one/${falseCropId}`)
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });

    it('should throw an exception because the user JWT does not have permissions for this action crops/remove/bulk ', async () => {
      const response = await request
        .default(app.getHttpServer())
        .delete('/crops/remove/bulk')
        .set('x-tenant-id', tenantId)
        .set('Cookie', `user-token=${token}`)
        .expect(403);
      expect(response.body.message).toEqual(
        `User ${userTest.first_name} need a permit for this action`,
      );
    });
  });
});
