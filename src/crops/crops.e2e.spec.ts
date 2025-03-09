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

describe('CropsController e2e', () => {
  let app: INestApplication;
  let seedService: SeedService;
  let authService: AuthService;
  let userTest: User;
  let token: string;
  let cropRepository: Repository<Crop>;

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
    authService = moduleFixture.get<AuthService>(AuthService);

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

    cropRepository = moduleFixture.get<Repository<Crop>>(
      getRepositoryToken(Crop),
    );
    await cropRepository.delete({});

    userTest = await authService.createUserToTests();
    token = authService.generateJwtToken({
      id: userTest.id,
    });
  });

  afterAll(async () => {
    await authService.deleteUserToTests(userTest.id);
    await app.close();
  });

  async function createTestCrop(data: CreateCropDto) {
    const crop = cropRepository.create(data);
    return await cropRepository.save(crop);
  }

  describe('/crops/create (POST)', () => {
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

    it('It should throw an exception because the user JWT does not have permissions for this action /crops/create', async () => {
      await authService.removePermission(userTest.id, 'create_client');

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

    it('should create a new client', async () => {
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

    it('Should throw exception when fields are missing in the body', async () => {
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

    it('Should throw exception for trying to create a crop with duplicate name.', async () => {
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
});
