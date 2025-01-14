import { Test, TestingModule } from '@nestjs/testing';
import { ConsumptionsService } from './consumptions.service';

describe('ConsumptionsService', () => {
  let service: ConsumptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsumptionsService],
    }).compile();

    service = module.get<ConsumptionsService>(ConsumptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
