import { Injectable } from '@nestjs/common';
import { ClientsService } from 'src/clients/clients.service';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { Employee } from 'src/employees/entities/employee.entity';

import { HarvestDto } from 'src/harvest/dto/harvest.dto';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { HarvestService } from 'src/harvest/harvest.service';
import { PaymentDto } from 'src/payments/dto/payment.dto';
import { PaymentsService } from 'src/payments/payments.service';
import { SaleDto } from 'src/sales/dto/sale.dto';
import { SalesService } from 'src/sales/sales.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';

import { AuthService } from 'src/auth/auth.service';
import { ConsumptionsService } from 'src/consumptions/consumptions.service';
import { ConsumptionSuppliesDto } from 'src/consumptions/dto/consumption-supplies.dto';

import { HarvestProcessedDto } from 'src/harvest/dto/harvest-processed.dto';
import { ShoppingService } from 'src/shopping/shopping.service';
import { SuppliesService } from 'src/supplies/supplies.service';
import { UserDto } from 'src/users/dto/user.dto';
import { User } from 'src/users/entities/user.entity';
import { WorkDetailsDto } from 'src/work/dto/work-details.dto';
import { WorkDto } from 'src/work/dto/work.dto';
import { Work } from 'src/work/entities/work.entity';
import { WorkService } from 'src/work/work.service';
import { DeepPartial } from 'typeorm';
import { UsersService } from './../users/users.service';
import { CreateClientDto } from 'src/clients/dto/create-client.dto';

import { plainToClass } from 'class-transformer';
import { Client } from 'src/clients/entities/client.entity';
import { ConsumptionSuppliesDetailsDto } from 'src/consumptions/dto/consumption-supplies-details.dto';
import { SuppliesConsumption } from 'src/consumptions/entities/supplies-consumption.entity';
import { CreateCropDto } from 'src/crops/dto/create-crop.dto';
import { Crop } from 'src/crops/entities/crop.entity';
import { CreateEmployeeDto } from 'src/employees/dto/create-employee.dto';
import { HarvestDetailsDto } from 'src/harvest/dto/harvest-details.dto';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { MethodOfPayment } from 'src/payments/entities/payment.entity';
import { SaleDetailsDto } from 'src/sales/dto/sale-details.dto';
import { Sale } from 'src/sales/entities/sale.entity';
import { ShoppingSuppliesDetailsDto } from 'src/shopping/dto/shopping-supplies-details.dto';
import { ShoppingSuppliesDto } from 'src/shopping/dto/shopping-supplies.dto';
import { SuppliesShopping } from 'src/shopping/entities';
import { CreateSupplierDto } from 'src/suppliers/dto/create-supplier.dto';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { CreateSupplyDto } from 'src/supplies/dto/create-supply.dto';
import { Supply } from 'src/supplies/entities/supply.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { InformationGenerator } from './helpers/InformationGenerator';
import { EntityConvertedToDto } from './interfaces/EntityConvertedToDto';

@Injectable()
export class SeedService {
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

  async runSeedSelective(options: {
    clearDatabase?: boolean;
    users?: boolean;
    clients?: boolean;
    suppliers?: boolean;
    supplies?: boolean;
    employees?: boolean;
    crops?: boolean;
    harvests?: boolean;
    works?: boolean;
    sales?: boolean;
    shoppings?: boolean;
    consumptions?: boolean;
    modules?: boolean;
    adminUser?: boolean;
  }) {
    const {
      clearDatabase = false,
      users = false,
      clients = false,
      suppliers = false,
      supplies = false,
      employees = false,
      crops = false,
      harvests = false,
      works = false,
      sales = false,
      shoppings = false,
      consumptions = false,
      modules = false,
      adminUser = false,
    } = options;

    const history: Record<string, boolean> = {};

    if (clearDatabase) {
      await this.clearDatabase();
      history.clearDatabase = true;
    }

    if (modules) {
      await this.authService.createModulesWithActions();
      history.insertedModules = true;
    }

    if (adminUser) {
      await this.authService.convertToAdminUserSeed();
      history.insertedAdminUser = true;
    }

    if (users) {
      history.insertedUsers = await this.insertNewUsers();
    }

    if (clients) {
      history.insertedClients = await this.insertNewClients();
    }

    if (suppliers) {
      history.insertedSuppliers = await this.insertNewSuppliers();
    }

    if (supplies) {
      history.insertedSupplies = await this.insertNewSupplies();
    }

    if (employees) {
      history.insertedEmployees = await this.insertNewEmployees();
    }

    if (crops) {
      history.insertedCrops = await this.insertNewCrops();
    }

    if (harvests) {
      history.insertedHarvests = await this.insertNewHarvests();
    }

    if (works) {
      history.insertedWorks = await this.insertNewWorks();
    }

    if (sales) {
      history.insertedSales = await this.insertNewSales();
    }

    if (shoppings) {
      history.insertedShoppingSupplies = await this.insertNewShoppingSupplies();
    }

    if (consumptions) {
      history.insertedConsumptionSupplies =
        await this.insertNewConsumptionSupplies();
    }

    return {
      message: 'Selective seed executed successfully',
      history,
    };
  }

  async runSeed() {
    await this.clearDatabase();
    await this.authService.createModulesWithActions();
    await this.authService.convertToAdminUserSeed();
    const insertedUsers = await this.insertNewUsers();
    const insertedClients = await this.insertNewClients();
    const insertedSuppliers = await this.insertNewSuppliers();
    const insertedSupplies = await this.insertNewSupplies();
    const insertedEmployees = await this.insertNewEmployees();
    const insertedCrops = await this.insertNewCrops();
    const insertedHarvests = await this.insertNewHarvests();
    const insertedWorks = await this.insertNewWorks();
    const insertedSales = await this.insertNewSales();
    const insertedShoppingSupplies = await this.insertNewShoppingSupplies();
    const insertedConsumptionSupplies =
      await this.insertNewConsumptionSupplies();

    return {
      message: 'Seed executed successfully',
      history: {
        insertedUsers,
        insertedClients,
        insertedSuppliers,
        insertedSupplies,
        insertedEmployees,
        insertedCrops,
        insertedHarvests,
        insertedWorks,
        insertedSales,
        insertedShoppingSupplies,
        insertedConsumptionSupplies,
      },
    };
  }
  async insertNewSales() {
    try {
      for (let index = 0; index < 6; index++) {
        await this.CreateSaleGeneric({});
      }

      return true;
    } catch (error) {
      return false;
    }
  }
  async insertNewConsumptionSupplies() {
    try {
      for (let index = 0; index < 6; index++) {
        await this.CreateConsumption({});
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewWorks() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateWork({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewShoppingSupplies() {
    try {
      for (let index = 0; index < 6; index++) {
        await this.CreateShopping({});
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewHarvests() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateHarvest({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewCrops() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateCrop({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewEmployees() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateEmployee({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewSupplies() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateSupply({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewSuppliers() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateSupplier({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  async insertNewClients() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateClient({})),
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async insertNewUsers() {
    try {
      await Promise.all(
        Array.from({ length: 10 }).map(() => this.CreateUser({})),
      );
      return true;
    } catch (error) {
      return false;
    }
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
      date_of_creation: InformationGenerator.generateRandomDate({}),
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
    quantityEmployees = 1,
    amount = 150,
    valuePay = 90_000,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    quantityEmployees?: number;
    amount?: number;
    valuePay?: number;
    date?: string;
  }): Promise<{ employees: Employee[]; crop: Crop; harvest: Harvest }> {
    const employees = (await Promise.all(
      Array.from({ length: quantityEmployees }).map(() =>
        this.CreateEmployee({}),
      ),
    )) as Employee[];

    const crop = (await this.CreateCrop({})) as Crop;
    const data: HarvestDto = {
      date: date,
      crop: { id: crop.id },
      details: employees.map((employee) => {
        return {
          employee: { id: employee.id },
          amount: amount,
          value_pay: valuePay,
        } as HarvestDetailsDto;
      }),
      amount: amount * quantityEmployees,
      value_pay: valuePay * quantityEmployees,
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
    amount,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    cropId: string;
    harvestId: string;
    amount: number;
    date?: string;
  }): Promise<any> {
    return true;
    // const data: HarvestProcessedDto = {
    //   date: date,
    //   crop: { id: cropId },
    //   harvest: { id: harvestId },
    //   amount,
    // };

    // const harvestProcessed =
    //   await this.harvestsService.createHarvestProcessed(data);

    // return harvestProcessed;
  }

  async CreateWork({
    quantityEmployees = 1,
    valuePay = 90_000,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    quantityEmployees?: number;
    valuePay?: number;
    date?: string;
  }): Promise<{ employees: Employee[]; crop: Crop; work: Work }> {
    const employees = (await Promise.all(
      Array.from({ length: quantityEmployees }).map(() =>
        this.CreateEmployee({}),
      ),
    )) as Employee[];

    const crop = (await this.CreateCrop({})) as Crop;
    const data: WorkDto = {
      date: date,
      crop: { id: crop.id },
      details: employees.map((employee) => {
        return {
          employee: { id: employee.id },
          value_pay: valuePay,
        } as HarvestDetailsDto;
      }),
      value_pay: valuePay * quantityEmployees,
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
  async CreateHarvestAdvanced({
    employeeId,
    cropId,
    valuePay = 90_000,
    amount = 150,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    employeeId?: string;
    cropId?: string;
    valuePay?: number;
    amount?: number;
    date?: string;
  }): Promise<{ crop: Crop; harvest: Harvest }> {
    let crop;
    if (!cropId) {
      crop = (await this.CreateCrop({})) as Crop;
    }
    let employee;
    if (!employeeId) {
      employee = (await this.CreateEmployee({})) as Employee;
    }
    const data: HarvestDto = {
      date: date,
      crop: { id: cropId || crop.id },
      details: [
        {
          employee: { id: employeeId || employee.id },
          value_pay: valuePay,
          amount: amount,
        } as HarvestDetailsDto,
      ],
      value_pay: valuePay,
      amount: amount,
      observation: InformationGenerator.generateObservation(),
    };

    const harvest = await this.harvestsService.create(data);

    return {
      crop,
      harvest,
    };
  }
  async CreateWorkForEmployee({
    employeeId,
    valuePay = 90_000,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    employeeId: string;
    valuePay?: number;
    date?: string;
  }): Promise<{ crop: Crop; work: Work }> {
    const crop = (await this.CreateCrop({})) as Crop;
    const data: WorkDto = {
      date: date,
      crop: { id: crop.id },
      details: [
        {
          employee: { id: employeeId },
          value_pay: valuePay,
        } as WorkDetailsDto,
      ],
      value_pay: valuePay,
      description: InformationGenerator.generateDescription(),
    };

    const work = await this.workService.create(data);

    return {
      crop,
      work,
    };
  }

  async CreateSale({
    clientId,
    cropId,
    isReceivable = false,
    quantity = 15,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    cropId: string;
    clientId?: string;
    isReceivable?: boolean;
    quantity?: number;
    date?: string;
  }): Promise<{ sale: Sale; client: Client }> {
    let client: Client;
    if (!clientId) {
      client = (await this.CreateClient({})) as Client;
    }

    const data: SaleDto = {
      date: date,
      amount: quantity,
      value_pay: 840_000,
      details: [
        {
          amount: quantity,
          value_pay: 840_000,
          crop: { id: cropId },
          client: { id: clientId || client.id },
          is_receivable: isReceivable,
        } as SaleDetailsDto,
      ],
    };

    const sale = await this.salesService.create(data);
    return { client, sale };
  }
  async CreateSaleGeneric({
    isReceivable = false,
    quantity = 15,
    date = InformationGenerator.generateRandomDate({}),
  }: {
    isReceivable?: boolean;
    quantity?: number;
    date?: string;
  }): Promise<{ sale: Sale; client: Client; crop: Crop }> {
    const client: Client = (await this.CreateClient({})) as Client;

    const { crop, harvest } = await this.CreateHarvest({});
    await this.CreateHarvestProcessed({
      cropId: crop.id,
      harvestId: harvest.id,
      amount: 100,
    });

    const data: SaleDto = {
      date: date,
      amount: quantity,
      value_pay: 840_000,
      details: [
        {
          amount: quantity,
          value_pay: 840_000,
          crop: { id: crop.id },
          client: { id: client.id },
          is_receivable: isReceivable,
        } as SaleDetailsDto,
      ],
    };

    const sale = await this.salesService.create(data);
    return { client, sale, crop };
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
      await this.CreateShopping({ supplyId: supply.id, amount: 10_000 });
    }
    if (!cropId) {
      crop = (await this.CreateCrop({})) as Crop;
    }

    const data: ConsumptionSuppliesDto = {
      date: InformationGenerator.generateRandomDate({}),
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
  async CreateConsumptionExtended({
    date = InformationGenerator.generateRandomDate({}),
    quantitySupplies = 2,
    amountForItem = 2000,
  }: {
    quantitySupplies?: number;
    amountForItem?: number;
    date?: string;
  }): Promise<{
    consumption: SuppliesConsumption;
    crop: Crop;
    supplies: Supply[];
  }> {
    const crop: Crop = (await this.CreateCrop({})) as Crop;

    const supplies = (await Promise.all(
      Array.from({ length: quantitySupplies }).map(async () => {
        const supply = await this.CreateSupply({});

        await this.CreateShopping({ supplyId: supply.id });

        return supply;
      }),
    )) as Supply[];

    const data: ConsumptionSuppliesDto = {
      date: date,
      details: supplies.map((supply) => {
        return {
          supply: { id: supply.id },
          crop: { id: crop.id },
          amount: amountForItem,
        } as ConsumptionSuppliesDetailsDto;
      }),
    };

    const consumption = await this.consumptionsService.createConsumption(data);
    return { crop, consumption, supplies };
  }

  async CreateShopping({
    supplyId,
    amount = 4000,
    valuePay = 250_000,
  }: {
    supplyId?: string;
    amount?: number;
    valuePay?: number;
  }): Promise<{
    shopping: SuppliesShopping;
    supplier: Supplier;
    supply: Supply;
  }> {
    const supplier = (await this.CreateSupplier({})) as Supplier;
    const supply = (await this.CreateSupply({})) as Supply;

    const data: ShoppingSuppliesDto = {
      date: InformationGenerator.generateRandomDate({}),
      value_pay: valuePay,
      details: [
        {
          supply: { id: supplyId || supply.id },
          supplier: { id: supplier.id },
          amount,
          value_pay: valuePay,
        } as ShoppingSuppliesDetailsDto,
      ],
    };

    const shopping = await this.shoppingService.createShopping(data);
    return { supplier, shopping, supply };
  }
  async CreateShoppingExtended({
    quantitySupplies = 1,
    amountForItem = 4_000,
    valuePay = 250_000,
  }: {
    quantitySupplies?: number;
    amountForItem?: number;
    valuePay?: number;
  }): Promise<{
    shopping: SuppliesShopping;
    supplier: Supplier;
    supplies: Supply[];
  }> {
    const supplier = (await this.CreateSupplier({})) as Supplier;
    const supplies = (await Promise.all(
      Array.from({ length: quantitySupplies }).map(() => this.CreateSupply({})),
    )) as Supply[];

    const data: ShoppingSuppliesDto = {
      date: InformationGenerator.generateRandomDate({}),
      value_pay: valuePay * supplies.length,
      details: supplies.map((supply) => {
        return {
          supply: { id: supply.id },
          supplier: { id: supplier.id },
          amount: amountForItem,
          value_pay: valuePay,
        } as ShoppingSuppliesDetailsDto;
      }),
    };

    const shopping = await this.shoppingService.createShopping(data);
    return { supplier, shopping, supplies };
  }

  async CreatePayment({
    datePayment = InformationGenerator.generateRandomDate({}),
    employeeId,
    methodOfPayment = MethodOfPayment.EFECTIVO,
    worksId = [],
    harvestsId = [],
    value_pay,
  }: {
    datePayment?: string;
    employeeId?: string;
    methodOfPayment?: MethodOfPayment;
    worksId?: string[];
    harvestsId?: string[];
    value_pay: number;
  }) {
    const data: PaymentDto = plainToClass(PaymentDto, {
      date: datePayment,
      employee: { id: employeeId },
      method_of_payment: methodOfPayment,
      value_pay,
      categories: {
        harvests: [...(harvestsId as DeepPartial<HarvestDetails>[])],
        works: [...(worksId as DeepPartial<WorkDetails>[])],
      },
    });

    return await this.paymentsService.create(data);
  }
}
