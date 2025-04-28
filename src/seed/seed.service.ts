import { Injectable } from '@nestjs/common';
import { ClientsService } from 'src/clients/clients.service';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { Employee } from 'src/employees/entities/employee.entity';

import { HarvestDto } from 'src/harvest/dto/harvest.dto';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { HarvestService } from 'src/harvest/harvest.service';
import { CreatePaymentDto } from 'src/payments/dto/create-payment.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { CreateSaleDto } from 'src/sales/dto/create-sale.dto';
import { SalesService } from 'src/sales/sales.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';

import { AuthService } from 'src/auth/auth.service';
import { ConsumptionsService } from 'src/consumptions/consumptions.service';
import { CreateConsumptionSuppliesDto } from 'src/consumptions/dto/create-consumption-supplies.dto';

import { HarvestProcessedDto } from 'src/harvest/dto/harvest-processed.dto';
import { CreateShoppingSuppliesDto } from 'src/shopping/dto/create-shopping-supplies.dto';
import { ShoppingService } from 'src/shopping/shopping.service';
import { SuppliesService } from 'src/supplies/supplies.service';
import { UserDto } from 'src/users/dto/user.dto';
import { User } from 'src/users/entities/user.entity';
import { WorkDetailsDto } from 'src/work/dto/create-work-details.dto';
import { CreateWorkDto } from 'src/work/dto/create-work.dto';
import { Work } from 'src/work/entities/work.entity';
import { WorkService } from 'src/work/work.service';
import { DeepPartial } from 'typeorm';
import { UsersService } from './../users/users.service';
import { initialData } from './data/seed-data';
// import { AuthService } from 'src/auth/auth.service';
import { CreateClientDto } from 'src/clients/dto/create-client.dto';

import { Client } from 'src/clients/entities/client.entity';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { CreateEmployeeDto } from 'src/employees/dto/create-employee.dto';
import { HarvestDetailsDto } from 'src/harvest/dto/harvest-details.dto';
import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { SaleDetailsDto } from 'src/sales/dto/sale-details.dto';
import { Sale } from 'src/sales/entities/sale.entity';
import { ShoppingSuppliesDetailsDto } from 'src/shopping/dto/shopping-supplies-details.dto';
import { SuppliesShopping } from 'src/shopping/entities';
import { CreateSupplierDto } from 'src/suppliers/dto/create-supplier.dto';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { CreateSupplyDto } from 'src/supplies/dto/create-supply.dto';
import { Supply } from 'src/supplies/entities/supply.entity';
import { InformationGenerator } from './helpers/InformationGenerator';
import { EntityConvertedToDto } from './interfaces/EntityConvertedToDto';
import { ConsumptionSuppliesDetailsDto } from 'src/consumptions/dto/consumption-supplies-details.dto';
import { SuppliesConsumption } from 'src/consumptions/entities/supplies-consumption.entity';

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
    private readonly usersService: UsersService,
    private readonly cropsService: CropsService,
    private readonly employeesService: EmployeesService,
    private readonly clientsService: ClientsService,
    private readonly suppliersService: SuppliersService,
    private readonly suppliesService: SuppliesService,
    private readonly consumptionsService: ConsumptionsService,
    private readonly shoppingService: ShoppingService,
    private readonly harvestsService: HarvestService,
    private readonly workService: WorkService,
    private readonly salesService: SalesService,
    private readonly paymentsService: PaymentsService,
    private readonly authService: AuthService,
  ) {}

  async runSeed() {
    await this.clearDatabase();
    await this.authService.createModulesWithActions();
    await this.authService.convertToAdminUserSeed();
    // await this.insertNewUsers();
    // await this.insertNewClients();
    // await this.insertNewSuppliers();
    // await this.insertNewSupplies();
    // await this.insertNewEmployees();
    // await this.insertNewCrops();
    // await this.insertNewHarvests();
    // await this.insertNewHarvestsProcessed();
    // await this.insertNewShoppingSupplies();
    // await this.insertNewWork();
    // await this.insertNewConsumptionSupplies();
    // await this.insertNewSales();
    // await this.insertNewPayments();

    return 'SEED EXECUTED';
  }

  async clearDatabase() {
    await this.usersService.deleteAllUsers();
    await this.clientsService.deleteAllClients();
    await this.suppliesService.deleteAllStockSupplies();
    await this.shoppingService.deleteAllShoppingSupplies();
    await this.suppliersService.deleteAllSupplier();
    await this.consumptionsService.deleteAllConsumptionSupplies();
    await this.suppliesService.deleteAllSupplies();
    await this.harvestsService.deleteAllHarvest();
    await this.workService.deleteAllWork();
    await this.cropsService.deleteAllCrops();
    await this.employeesService.deleteAllEmployees();
    await this.salesService.deleteAllSales();
  }

  async CreateUser({
    mapperToDto = false,
    convertToAdmin = false,
  }): Promise<User | EntityConvertedToDto<User>> {
    const data: UserDto = {
      first_name: InformationGenerator.generateFirstName(),
      last_name: InformationGenerator.generateLastName(),
      email: InformationGenerator.generateEmail(),
      password: '123456',
      cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
      actions: [],
    };

    const user = await this.usersService.create(data);

    if (convertToAdmin) {
      await this.authService.convertToAdmin(user.id);
    }

    if (!mapperToDto) return user;

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: user.password,
      cell_phone_number: user.cell_phone_number,
      actions: user.actions,
    };
  }

  async CreateClient({
    mapperToDto = false,
  }): Promise<Client | EntityConvertedToDto<Client>> {
    const data: CreateClientDto = {
      first_name: InformationGenerator.generateFirstName(),
      last_name: InformationGenerator.generateLastName(),
      email: InformationGenerator.generateEmail(),
      cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
      address: InformationGenerator.generateAddress(),
    };

    const client = await this.clientsService.create(data);

    if (!mapperToDto) return client;

    return {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      cell_phone_number: client.cell_phone_number,
      address: client.address,
    };
  }
  async CreateSupplier({
    mapperToDto = false,
  }): Promise<Supplier | EntityConvertedToDto<Supplier>> {
    const data: CreateSupplierDto = {
      first_name: InformationGenerator.generateFirstName(),
      last_name: InformationGenerator.generateLastName(),
      email: InformationGenerator.generateEmail(),
      cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
      address: InformationGenerator.generateAddress(),
    };

    const supplier = await this.suppliersService.create(data);

    if (!mapperToDto) return supplier;

    return {
      id: supplier.id,
      first_name: supplier.first_name,
      last_name: supplier.last_name,
      email: supplier.email,
      cell_phone_number: supplier.cell_phone_number,
      address: supplier.address,
    };
  }

  async CreateCrop({
    mapperToDto = false,
  }): Promise<Crop | EntityConvertedToDto<Crop>> {
    const data: CreateCropDto = {
      name: 'Crop ' + InformationGenerator.generateRandomId(),
      description: InformationGenerator.generateDescription(),
      units: 1000,
      location: InformationGenerator.generateAddress(),
      date_of_creation: InformationGenerator.generateRandomDate(),
    } as CreateCropDto;

    const crop = await this.cropsService.create(data);

    if (!mapperToDto) return crop;

    return {
      id: crop.id,
      name: crop.name,
      description: crop.description,
      units: crop.units,
      location: crop.location,
      date_of_creation: crop.date_of_creation,
      date_of_termination: crop.date_of_termination,
    };
  }
  async CreateEmployee({
    mapperToDto = false,
  }): Promise<Employee | EntityConvertedToDto<Employee>> {
    const data: CreateEmployeeDto = {
      first_name: InformationGenerator.generateFirstName(),
      last_name: InformationGenerator.generateLastName(),
      email: InformationGenerator.generateEmail(),
      cell_phone_number: InformationGenerator.generateCellPhoneNumber(),
      address: InformationGenerator.generateAddress(),
    };

    const employee = await this.employeesService.create(data);

    if (!mapperToDto) return employee;

    return {
      id: employee.id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      cell_phone_number: employee.cell_phone_number,
      address: employee.address,
    };
  }

  async CreateHarvest({
    // mapperToDto = false,
    quantityEmployees = 1,
  }): Promise<{ employees: Employee[]; crop: Crop; harvest: Harvest }> {
    const employees = (await Promise.all(
      Array.from({ length: quantityEmployees }).map(() =>
        this.CreateEmployee({}),
      ),
    )) as Employee[];

    const crop = (await this.CreateCrop({})) as Crop;
    const data: HarvestDto = {
      date: InformationGenerator.generateRandomDate(),
      crop: { id: crop.id },
      details: employees.map((employee) => {
        return {
          employee: { id: employee.id },
          total: 150,
          value_pay: 90_000,
        } as HarvestDetailsDto;
      }),
      total: 150 * quantityEmployees,
      value_pay: 90_000 * quantityEmployees,
      observation: InformationGenerator.generateObservation(),
    };

    const harvest = await this.harvestsService.create(data);

    return {
      employees,
      crop,
      harvest,
    };
  }
  async CreateHarvestProcessed({
    cropId,
    harvestId,
    total,
  }: {
    cropId: string;
    harvestId: string;
    total: number;
  }): Promise<HarvestProcessed> {
    const data: HarvestProcessedDto = {
      date: InformationGenerator.generateRandomDate(),
      crop: { id: cropId },
      harvest: { id: harvestId },
      total,
    };

    const harvestProcessed =
      await this.harvestsService.createHarvestProcessed(data);

    return harvestProcessed;
  }

  async CreateWork({
    // mapperToDto = false,
    quantityEmployees = 1,
  }): Promise<{ employees: Employee[]; crop: Crop; work: Work }> {
    const employees = (await Promise.all(
      Array.from({ length: quantityEmployees }).map(() =>
        this.CreateEmployee({}),
      ),
    )) as Employee[];

    const crop = (await this.CreateCrop({})) as Crop;
    const data: CreateWorkDto = {
      date: InformationGenerator.generateRandomDate(),
      crop: { id: crop.id },
      details: employees.map((employee) => {
        return {
          employee: { id: employee.id },
          value_pay: 90_000,
        } as HarvestDetailsDto;
      }),
      value_pay: 90_000 * quantityEmployees,
      description: InformationGenerator.generateDescription(),
    };

    const work = await this.workService.create(data);

    // if (!mapperToDto) return { employees, crop, work };

    return {
      employees,
      crop,
      work,
    };
  }

  async CreateSale({
    cropId,
    isReceivable = false,
    quantity = 15,
  }: {
    cropId: string;
    isReceivable?: boolean;
    quantity?: number;
  }): Promise<{ sale: Sale; client: Client }> {
    const client = (await this.CreateClient({})) as Client;

    const data: CreateSaleDto = {
      date: InformationGenerator.generateRandomDate(),
      quantity,
      total: 840_000,
      details: [
        {
          quantity,
          total: 840_000,
          crop: { id: cropId },
          client: { id: client.id },
          is_receivable: isReceivable,
        } as SaleDetailsDto,
      ],
    };

    const sale = await this.salesService.create(data);
    return { client, sale };
  }

  async CreateSupply({
    mapperToDto = false,
  }): Promise<Supply | EntityConvertedToDto<Supply>> {
    const data: CreateSupplyDto = {
      name: 'Supply ' + InformationGenerator.generateRandomId(),
      brand: InformationGenerator.generateSupplyBrand(),
      unit_of_measure: InformationGenerator.generateUnitOfMeasure(),
      observation: InformationGenerator.generateObservation(),
    };

    const supply = await this.suppliesService.create(data);

    if (!mapperToDto) return supply;

    return {
      ...data,
      id: supply.id,
    };
  }

  async CreateConsumption({
    supplyId,
    cropId,
    amount = 2000,
  }: {
    supplyId?: string;
    cropId?: string;
    amount?: number;
  }): Promise<{
    consumption: SuppliesConsumption;
    crop: Crop;
    supply: Supply;
  }> {
    let supply: Supply;
    let crop: Crop;

    if (!supplyId) {
      supply = (await this.CreateSupply({})) as Supply;
    }
    if (!cropId) {
      crop = (await this.CreateCrop({})) as Crop;
    }

    const data: CreateConsumptionSuppliesDto = {
      date: InformationGenerator.generateRandomDate(),
      details: [
        {
          supply: { id: supplyId || supply.id },
          crop: { id: cropId || crop.id },
          amount,
        } as ConsumptionSuppliesDetailsDto,
      ],
    };

    const consumption = await this.consumptionsService.createConsumption(data);
    return { crop, consumption, supply };
  }
  async CreateShopping({
    supplyId,
    valuePay = 250_000,
  }: {
    supplyId?: string;
    valuePay?: number;
  }): Promise<{
    shopping: SuppliesShopping;
    supplier: Supplier;
    supply: Supply;
  }> {
    const supplier = (await this.CreateSupplier({})) as Supplier;
    const supply = (await this.CreateSupply({})) as Supply;

    const data: CreateShoppingSuppliesDto = {
      date: InformationGenerator.generateRandomDate(),
      value_pay: valuePay,
      details: [
        {
          supply: { id: supplyId || supply.id },
          supplier: { id: supplier.id },
          amount: 4000,
          value_pay: valuePay,
        } as ShoppingSuppliesDetailsDto,
      ],
    };

    const shopping = await this.shoppingService.createShopping(data);
    return { supplier, shopping, supply };
  }

  async insertNewCrops() {
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
  async insertNewEmployees() {
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
  async insertNewClients() {
    const clients = initialData.clients;

    const insertPromises = [];

    clients.forEach((client) => {
      insertPromises.push(this.clientsService.create(client));
    });

    const result = await Promise.all(insertPromises);

    this.clientsIds = result.map((client) => new String(client.id).toString());

    return true;
  }
  async insertNewSuppliers() {
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
  async insertNewSupplies() {
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
      const objectToCreate: HarvestDto = {
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
      const objectToCreate: HarvestProcessedDto = {
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
  private async insertNewShoppingSupplies() {
    const [supply1, supply2, supply3] = this.suppliesIds;
    const [supplier1] = this.suppliersIds;

    const initialShopping: any = initialData.shoppingSupplies[0];

    const { details, ...rest } = initialShopping;

    for (let index = 0; index < 3; index++) {
      const objectToCreate: CreateShoppingSuppliesDto = {
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

      await this.shoppingService.createShopping(objectToCreate);
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

      await this.consumptionsService.createConsumption(objectToCreate);
    }

    return true;
  }

  private async insertNewWork() {
    const [crop1, crop2, crop3] = this.cropIds;
    const crops = [crop1, crop2, crop3];

    const [employee1, employee2, employee3]: string[] = this.employeeIds;
    const employees = [employee1, employee2, employee3];

    const works = initialData.works;
    const insertPromises = [];
    works.forEach((work, index) => {
      const recordToCreate: CreateWorkDto = {
        ...work,
        crop: { id: crops[index] },
        details: [
          {
            employee: { id: employees[index] },
            value_pay: 35000,
          },
        ] as WorkDetailsDto[],
      };
      insertPromises.push(this.workService.create(recordToCreate));
    });
    const result = await Promise.all(insertPromises);
    this.worksIds = result.map((work: Work) => new String(work.id).toString());

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
