import { Injectable } from '@nestjs/common';
import { ClientsService } from 'src/clients/clients.service';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { Employee } from 'src/employees/entities/employee.entity';
import { CreateHarvestProcessedDto } from 'src/harvest/dto/create-harvest-processed.dto';
import { CreateHarvestDto } from 'src/harvest/dto/create-harvest.dto';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { HarvestService } from 'src/harvest/harvest.service';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateSaleDto } from 'src/sales/dto/create-sale.dto';
import { SalesService } from 'src/sales/sales.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { CreateConsumptionSuppliesDto } from 'src/supplies/dto/create-consumption-supplies.dto';
import { CreatePurchaseSuppliesDto } from 'src/supplies/dto/create-purchase-supplies.dto';
import { SuppliesService } from 'src/supplies/supplies.service';
import { CreateWorkDto } from 'src/work/dto/create-work.dto';
import { Work } from 'src/work/entities/work.entity';
import { WorkService } from 'src/work/work.service';
import { DataSource, DeepPartial } from 'typeorm';
import { UsersService } from './../users/users.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
  private cropIds = [];
  private employeeIds = [];
  private clientsIds = [];
  private suppliesIds = [];
  private suppliersIds = [];
  private harvestIds = [];
  private harvestDetails = [];
  private worksIds = [];

  constructor(
    private dataSource: DataSource,
    private readonly usersService: UsersService,
    private readonly cropsService: CropsService,
    private readonly employeesService: EmployeesService,
    private readonly clientsService: ClientsService,
    private readonly suppliersService: SuppliersService,
    private readonly suppliesService: SuppliesService,
    private readonly harvestsService: HarvestService,
    private readonly workService: WorkService,
    private readonly salesService: SalesService,
    private readonly paymentsService: PaymentsService,
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
    await this.insertNewHarvestsProcessed();
    await this.insertNewPurchaseSupplies();
    // await this.insertNewConsumptionSupplies();
    // await this.insertNewWork();
    // await this.insertNewSales();
    // await this.insertNewPayments();

    return 'SEED EXECUTED';
  }

  private async deleteTables() {
    await this.usersService.deleteAllUsers();
    await this.clientsService.deleteAllClients();
    await this.suppliesService.deleteAllStockSupplies();
    await this.suppliesService.deleteAllPurchaseSupplies();
    await this.suppliersService.deleteAllSupplier();
    await this.suppliesService.deleteAllConsumptionSupplies();
    await this.suppliesService.deleteAllSupplies();
    await this.harvestsService.deleteAllHarvest();
    await this.workService.deleteAllWork();
    await this.cropsService.deleteAllCrops();
    await this.employeesService.deleteAllEmployees();
    await this.salesService.deleteAllSales();
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

    const result = await Promise.all(insertPromises);

    this.clientsIds = result.map((client) => new String(client.id).toString());

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
            employee: { id: `${employee1}` },
          },
          {
            ...details[1],
            employee: { id: `${employee2}` },
          },
        ],
      };

      insertPromises.push(this.harvestsService.create(objectToCreate));
    }

    const result = await Promise.all(insertPromises);

    this.harvestIds = result.map((harvest) =>
      new String(harvest.id).toString(),
    );

    this.harvestDetails = result.map((harvest) => {
      return harvest.details;
    });

    return true;
  }
  private async insertNewHarvestsProcessed() {
    const [crop1, crop2, crop3] = this.cropIds;
    const crops = [crop1, crop2, crop3];
    const [harvest1, harvest2, harvest3]: DeepPartial<Harvest>[] =
      this.harvestIds;

    const harvests = [harvest1, harvest2, harvest3];

    const initialHarvest: any = initialData.harvestProcessed[0];

    const insertPromises = [];

    for (let index = 0; index < 3; index++) {
      const objectToCreate: CreateHarvestProcessedDto = {
        ...initialHarvest,
        crop: { id: crops[index] },
        harvest: { id: harvests[index] },
      };

      insertPromises.push(
        this.harvestsService.createHarvestProcessed(objectToCreate),
      );
    }

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewPurchaseSupplies() {
    const [supply1, supply2, supply3] = this.suppliesIds;
    const [supplier1] = this.suppliersIds;

    const initialPurchase: any = initialData.purchaseSupplies[0];

    const { details, ...rest } = initialPurchase;

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
    }

    return true;
  }
  private async insertNewConsumptionSupplies() {
    const [supply1, supply2, supply3] = this.suppliesIds;
    const [crop1] = this.cropIds;

    const initialConsumption: any = initialData.consumptionSupplies[0];

    const { details, ...rest } = initialConsumption;

    for (let index = 0; index < 3; index++) {
      const objectToCreate: CreateConsumptionSuppliesDto = {
        ...rest,
        details: [
          {
            ...details[0],
            crop: `${crop1}`,
            supply: `${supply1}`,
          },
          {
            ...details[1],
            crop: `${crop1}`,
            supply: `${supply2}`,
          },
          {
            ...details[2],
            crop: `${crop1}`,
            supply: `${supply3}`,
          },
        ],
      };

      await this.suppliesService.createConsumption(objectToCreate);
    }

    return true;
  }

  private async insertNewWork() {
    // const [crop1, crop2, crop3] = this.cropIds;
    // const crops = [crop1, crop2, crop3];

    // const [employee1, employee2, employee3]: DeepPartial<Employee>[] =
    //   this.employeeIds;
    // const employees = [employee1, employee2, employee3];

    // const works = initialData.works;
    // const insertPromises = [];
    // works.forEach((work, index) => {
    //   const recordToCreate: CreateWorkDto = {
    //     ...work,
    //     crop: crops[index],
    //     employee: employees[index],
    //   };
    //   insertPromises.push(this.workService.create(recordToCreate));
    // });
    // const result = await Promise.all(insertPromises);
    // this.worksIds = result.map((work: Work) => new String(work.id).toString());

    return true;
  }

  private async insertNewSales() {
    const [crop1, crop2, crop3] = this.cropIds;

    const [client1, client2, client3] = this.clientsIds;

    const initialSale: any = initialData.sales[0];

    const { details, ...rest } = initialSale;

    const objectToCreate: CreateSaleDto = {
      ...rest,
      details: [
        {
          ...details[0],
          crop: `${crop1}`,
          client: `${client1}`,
        },
        {
          ...details[1],
          crop: `${crop2}`,
          client: `${client2}`,
        },
        {
          ...details[2],
          crop: `${crop3}`,
          client: `${client3}`,
        },
      ],
    };
    await this.salesService.create(objectToCreate);

    return true;
  }

  private async insertNewPayments() {
    const initialPayment = initialData.payments[0];

    const [employee1]: DeepPartial<Employee>[] = this.employeeIds;

    const [work1]: DeepPartial<Work>[] = this.worksIds;

    const harvestDetails: any = this.harvestDetails;

    const objectToCreate: CreatePaymentDto = {
      date: initialPayment.date,
      method_of_payment: initialPayment.method_of_payment,
      employee: employee1,
      total: 185000,
      categories: {
        harvests: [
          harvestDetails[0][0].id,
          harvestDetails[1][0].id,
          harvestDetails[2][0].id,
        ],
        works: [work1],
      },
    };

    await this.paymentsService.create(objectToCreate);
  }
}
