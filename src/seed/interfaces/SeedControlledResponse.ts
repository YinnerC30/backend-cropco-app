import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Supply } from 'src/supplies/entities';
import { User } from 'src/users/entities/user.entity';
import { Work } from 'src/work/entities/work.entity';

export interface SeedControlledResponse {
  message: string;
  history: {
    insertedUsers?: User[];
    insertedClients?: Client[];
    insertedSuppliers?: Supplier[];
    insertedSupplies?: Supply[];
    insertedEmployees?: Employee[];
    insertedCrops?: Crop[];
    insertedHarvests?: {
      employees: Employee[];
      crop: Crop;
      harvest: Harvest;
    }[];
    insertedWorks?: {
      employees: Employee[];
      crop: Crop;
      work: Work;
    }[];
    insertedSales?: unknown[];
    insertedShoppingSupplies?: unknown[];
    insertedConsumptionSupplies?: unknown[];
  };
}
