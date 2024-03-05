import { DataSource } from 'typeorm';
import { Harvest } from './entities/harvest.entity';

export const harvestProviders = [
  {
    provide: 'HARVEST_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Harvest),
    inject: ['DATA_SOURCE'],
  },
];
