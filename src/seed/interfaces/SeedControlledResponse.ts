import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import { Employee } from 'src/employees/entities/employee.entity';
import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { Sale } from 'src/sales/entities/sale.entity';
import { SuppliesShopping } from 'src/shopping/entities';
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
    insertedHarvestsProcessed?: HarvestProcessed[];
    insertedWorks?: {
      employees: Employee[];
      crop: Crop;
      work: Work;
    }[];
    insertedSales?: {
      sale: Sale;
      client: Client;
      crop: Crop;
    }[];
    insertedShoppingSupplies?: {
      shopping: SuppliesShopping;
      supplier: Supplier;
      supply: Supply;
    }[];
    insertedConsumptionSupplies?: unknown[];
  };
}
