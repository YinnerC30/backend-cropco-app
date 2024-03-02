import { DataSource } from 'typeorm';
import { Supply } from './entities/supply.entity';

export const supplyProviders = [
  {
    provide: 'SUPPLY_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Supply),
    inject: ['DATA_SOURCE'],
  },
];
