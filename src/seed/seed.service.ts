import { Injectable } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { initialData } from './data/seed-data';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { ClientsService } from 'src/clients/clients.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { SuppliesService } from 'src/supplies/supplies.service';
import { HarvestService } from 'src/harvest/harvest.service';
import { DataSource, DeepPartial } from 'typeorm';
import { CreateHarvestDto } from 'src/harvest/dto/create-harvest.dto';
import { Employee } from 'src/employees/entities/employee.entity';
import { CreatePurchaseSuppliesDto } from 'src/supplies/dto/create-purchase-supplies.dto';

@Injectable()
export class SeedService {
  private cropIds = [];
  private employeeIds = [];
  private suppliesIds = [];
  private suppliersIds = [];

  constructor(
    private dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly cropsService: CropsService,
    private readonly employeesService: EmployeesService,
    private readonly clientsService: ClientsService,
    private readonly suppliersService: SuppliersService,
    private readonly suppliesService: SuppliesService,
    private readonly harvestsService: HarvestService,
  ) {}

  async runSeed() {
    await this.deleteTables();
    await this.insertNewUsers();
    await this.insertNewClients();
    await this.insertNewSuppliers();
    await this.insertNewSupplies();
    await this.insertNewEmployees();
    await this.insertNewCrops();
    await this.insertNewHarvests();
    await this.insertNewPurchaseSupplies();

    return 'SEED EXECUTED';
  }

  private async deleteTables() {
    await this.usersService.deleteAllUsers();
    await this.clientsService.deleteAllClients();
    await this.suppliesService.deleteAllPurchaseSupplies();
    await this.suppliersService.deleteAllSupplier();
    await this.suppliesService.deleteAllSupplies();
    await this.harvestsService.deleteAllHarvest();
    await this.cropsService.deleteAllCrops();
    await this.employeesService.deleteAllEmployees();
  }

  private async insertNewUsers() {
    const Users = initialData.users;

    const insertPromises = [];

    Users.forEach((user) => {
      insertPromises.push(this.usersService.create(user));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewCrops() {
    const crops = initialData.crops;

    const insertPromises = [];

    crops.forEach((crop) => {
      const { units, ...rest } = crop;
      insertPromises.push(
        this.cropsService.create({ units: Number(units), ...rest }),
      );
    });

    const result = await Promise.all(insertPromises);

    this.cropIds = result.map((crop) => new String(crop.id).toString());

    return true;
  }
  private async insertNewEmployees() {
    const employees = initialData.employees;

    const insertPromises = [];

    employees.forEach((employee) => {
      insertPromises.push(this.employeesService.create(employee));
    });

    const result = await Promise.all(insertPromises);

    this.employeeIds = result.map((employee) =>
      new String(employee.id).toString(),
    );

    return true;
  }
  private async insertNewClients() {
    const clients = initialData.clients;

    const insertPromises = [];

    clients.forEach((client) => {
      insertPromises.push(this.clientsService.create(client));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewSuppliers() {
    const suppliers = initialData.suppliers;

    const insertPromises = [];

    suppliers.forEach((supplier) => {
      insertPromises.push(this.suppliersService.create(supplier));
    });

    const result = await Promise.all(insertPromises);

    this.suppliersIds = result.map((supplier) =>
      new String(supplier.id).toString(),
    );

    return true;
  }
  private async insertNewSupplies() {
    const supplies = initialData.supplies;

    const insertPromises = [];

    supplies.forEach((supply) => {
      insertPromises.push(this.suppliesService.create(supply));
    });

    const result = await Promise.all(insertPromises);

    this.suppliesIds = result.map((supply) => new String(supply.id).toString());

    return true;
  }
  private async insertNewHarvests() {
    const [crop1, crop2, crop3, crop4] = this.cropIds;
    const crops = [crop1, crop2, crop3];
    const [employee1, employee2]: DeepPartial<Employee>[] = this.employeeIds;

    const initialHarvest: any = initialData.harvests[0];

    const { details, ...rest } = initialHarvest;

    const insertPromises = [];

    for (let index = 0; index < 3; index++) {
      const objectToCreate: CreateHarvestDto = {
        ...rest,
        crop: crops[index],
        details: [
          {
            ...details[0],
            employee: `${employee1}`,
          },
          {
            ...details[1],
            employee: `${employee2}`,
          },
        ],
      };

      insertPromises.push(this.harvestsService.create(objectToCreate));
    }

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewPurchaseSupplies() {
    const [supply1, supply2, supply3] = this.suppliesIds;
    const [supplier1] = this.suppliersIds;

    const initialPurchase: any = initialData.purchaseSupplies[0];

    const { details, ...rest } = initialPurchase;

    const insertPromises = [];

    for (let index = 0; index < 3; index++) {
      const objectToCreate: CreatePurchaseSuppliesDto = {
        ...rest,
        details: [
          {
            ...details[0],
            supplier: `${supplier1}`,
            supply: `${supply1}`,
          },
          {
            ...details[1],
            supplier: `${supplier1}`,
            supply: `${supply2}`,
          },
          {
            ...details[2],
            supplier: `${supplier1}`,
            supply: `${supply3}`,
          },
        ],
      };

      await this.suppliesService.createPurchase(objectToCreate);

      // insertPromises.push(this.suppliesService.createPurchase(objectToCreate));
    }

    // await Promise.all(insertPromises);

    return true;
  }

  private handleExceptions(error: any) {}
}
