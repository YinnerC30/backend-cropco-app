import { Inject, Injectable } from '@nestjs/common';
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
import { MethodOfPayment, Payment } from 'src/payments/entities/payment.entity';
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
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { SeedControlledDto } from './dto/seed.dto';
import { SeedControlledResponse } from './interfaces/SeedControlledResponse';

@Injectable()
export class SeedService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
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

  /**
   * Executes a controlled seed, allowing to specify the exact number of records to create for each entity.
   * @param options - Object specifying the quantity for each entity to create.
   * @returns An object with a message and the history of inserted records.
   */
  /**
   * Executes a controlled seed, allowing to specify the exact number of records to create for each entity.
   * @param options - Object specifying the quantity for each entity to create.
   * @returns An object with a message and the history of inserted records.
   */
  async runSeedControlled(
    options: SeedControlledDto,
  ): Promise<SeedControlledResponse> {
    const {
      users = 0,
      clients = 0,
      suppliers = 0,
      supplies = 0,
      employees = 0,
      crops = 0,
      harvests = { quantity: 0, variant: 'normal' },
      works = { quantity: 0, variant: 'normal' },
      sales = { quantity: 0, variant: 'generic' },
      shoppings = { quantity: 0, variant: 'extended' },
      consumptions = { quantity: 0, variant: 'extended' },
      payments = { variant: 'normal' },
      harvestsProcessed = { quantity: 0 }, // Añadido harvest processed
      customUser = {
        modules: [],
        actions: [],
      },
    } = options;

    const history: {
      insertedUsers?: Promise<User>[];
      insertedClients?: Promise<Client>[];
      insertedSuppliers?: Promise<Supplier>[];
      insertedSupplies?: Promise<Supply>[];
      insertedEmployees?: Promise<Employee>[];
      insertedCrops?: Promise<Crop>[];
      insertedHarvests?: unknown[];
      insertedHarvestsProcessed?: HarvestProcessed[]; // Añadido harvest processed
      insertedWorks?: unknown[];
      insertedSales?: unknown[];
      insertedShoppingSupplies?: unknown[];
      insertedConsumptionSupplies?: unknown[];
      insertedPayments?: unknown[];
      insertedCustomUser?: unknown;
    } = {};

    if (customUser.modules.length > 0 || customUser.actions.length > 0) {
      const user = await this.authService.createUserToTests();
      for (const module of customUser.modules) {
        await this.authService.addPermissionsToModule(user.id, module);
      }
      for (const action of customUser.actions) {
        await this.authService.addPermission(user.id, action);
      }

      const finalUser = await this.usersService.findOne(user.id);
      history.insertedCustomUser = finalUser;
    }

    if (users > 0) {
      const userPromises: Promise<User>[] = [];
      for (let i = 0; i < users; i++) {
        userPromises.push(this.CreateUser({}) as Promise<User>);
      }
      history.insertedUsers = (await Promise.all(userPromises)) as any;
    }

    if (clients > 0) {
      const clientPromises: Promise<Client>[] = [];
      for (let i = 0; i < clients; i++) {
        clientPromises.push(this.CreateClient({}) as Promise<Client>);
      }
      history.insertedClients = (await Promise.all(clientPromises)) as any;
    }

    if (suppliers > 0) {
      const supplierPromises: Promise<Supplier>[] = [];
      for (let i = 0; i < suppliers; i++) {
        supplierPromises.push(this.CreateSupplier({}) as Promise<Supplier>);
      }
      history.insertedSuppliers = (await Promise.all(supplierPromises)) as any;
    }

    if (supplies > 0) {
      const supplyPromises: Promise<Supply>[] = [];
      for (let i = 0; i < supplies; i++) {
        supplyPromises.push(this.CreateSupply({}) as Promise<Supply>);
      }
      history.insertedSupplies = (await Promise.all(supplyPromises)) as any;
    }

    if (employees > 0) {
      const employeePromises: Promise<Employee>[] = [];
      for (let i = 0; i < employees; i++) {
        employeePromises.push(this.CreateEmployee({}) as Promise<Employee>);
      }
      history.insertedEmployees = (await Promise.all(employeePromises)) as any;
    }

    if (crops > 0) {
      const cropPromises: Promise<Crop>[] = [];
      for (let i = 0; i < crops; i++) {
        cropPromises.push(this.CreateCrop({}) as Promise<Crop>);
      }
      history.insertedCrops = (await Promise.all(cropPromises)) as any;
    }

    if (harvests.quantity > 0) {
      const harvestPromises: Promise<any>[] = [];
      for (let i = 0; i < harvests.quantity; i++) {
        if (harvests.variant === 'advanced') {
          harvestPromises.push(
            this.CreateHarvestAdvanced({
              date: harvests.date,
              employeeId: harvests.employeeId,
              cropId: harvests.cropId,
              valuePay: harvests.valuePay,
              amount: harvests.amount,
            }),
          );
        } else {
          harvestPromises.push(
            this.CreateHarvest({
              date: harvests.date,
              quantityEmployees: harvests.quantityEmployees,
              amount: harvests.amount,
              valuePay: harvests.valuePay,
            }),
          );
        }
      }
      history.insertedHarvests = await Promise.all(harvestPromises);
    }

    if (harvestsProcessed.quantity > 0) {
      const harvestProcessedPromises: Promise<any>[] = [];
      for (let i = 0; i < harvestsProcessed.quantity; i++) {
        const cropId = harvestsProcessed.cropId;
        const harvestId = harvestsProcessed.harvestId;
        const amount = harvestsProcessed.amount || 50;

        harvestProcessedPromises.push(
          this.CreateHarvestProcessed({
            cropId,
            harvestId,
            amount,
          }),
        );
      }
      history.insertedHarvestsProcessed = await Promise.all(
        harvestProcessedPromises,
      );
    }

    if (works.quantity > 0) {
      const workPromises: Promise<any>[] = [];
      let employeeId = works.employeeId;
      if (works.variant === 'forEmployee' && !employeeId) {
        const employee = await this.CreateEmployee({});
        employeeId = employee.id;
        works.employeeId = employeeId;
      }
      for (let i = 0; i < works.quantity; i++) {
        if (works.variant === 'forEmployee') {
          workPromises.push(
            this.CreateWorkForEmployee({
              date: works.date,
              employeeId: works.employeeId,
              valuePay: works.valuePay,
            }),
          );
        } else {
          workPromises.push(
            this.CreateWork({
              date: works.date,
              quantityEmployees: works.quantityEmployees,
              valuePay: works.valuePay,
            }),
          );
        }
      }
      history.insertedWorks = await Promise.all(workPromises);
    }

    if (sales.quantity > 0) {
      history.insertedSales = [];
      for (let i = 0; i < sales.quantity; i++) {
        let sale;
        if (sales.variant === 'normal') {
          if (!sales.cropId) {
            const crop = await this.CreateCrop({});
            sales.cropId = crop.id;
          }
          sale = await this.CreateSale({
            date: sales.date,
            clientId: sales.clientId,
            cropId: sales.cropId,
            isReceivable: sales.isReceivable,
            quantity: sales.quantityPerSale,
          });
        } else {
          sale = await this.CreateSaleGeneric({
            date: sales.date,
            isReceivable: sales.isReceivableGeneric,
            quantity: sales.quantityPerSaleGeneric,
          });
        }
        history.insertedSales.push(sale);
      }
    }

    if (shoppings.quantity > 0) {
      const shoppingPromises: Promise<any>[] = [];
      for (let i = 0; i < shoppings.quantity; i++) {
        if (shoppings.variant === 'normal') {
          shoppingPromises.push(
            this.CreateShopping({
              supplyId: shoppings.supplyId,
              amount: shoppings.amount,
              valuePay: shoppings.valuePay,
            }),
          );
        } else {
          shoppingPromises.push(
            this.CreateShoppingExtended({
              quantitySupplies: shoppings.quantitySupplies,
              amountForItem: shoppings.amountForItem,
              valuePay: shoppings.valuePayExtended,
            }),
          );
        }
      }
      history.insertedShoppingSupplies = await Promise.all(shoppingPromises);
    }

    if (consumptions.quantity > 0) {
      history.insertedConsumptionSupplies = [];
      for (let i = 0; i < consumptions.quantity; i++) {
        let consumption;
        if (consumptions.variant === 'normal') {
          consumption = await this.CreateConsumption({
            supplyId: consumptions.supplyId,
            cropId: consumptions.cropId,
            amount: consumptions.amount,
          });
        } else {
          consumption = await this.CreateConsumptionExtended({
            date: consumptions.date,
            quantitySupplies: consumptions.quantitySupplies,
            amountForItem: consumptions.amountForItem,
          });
        }
        history.insertedConsumptionSupplies.push(consumption);
      }
    }

    if (payments.quantity > 0) {
      const paymentPromises: Promise<any>[] = [];
      for (let i = 0; i < payments.quantity; i++) {
        paymentPromises.push(
          this.CreatePayment({
            datePayment: payments.date,
            employeeId: payments.employeeId,
            methodOfPayment: payments.methodOfPayment || ('EFECTIVO' as any),
            value_pay: payments.valuePay,
            harvestsId: Array.isArray(payments.harvestsId)
              ? [...payments.harvestsId]
              : [],
            worksId: Array.isArray(payments.worksId)
              ? [...payments.worksId]
              : [],
          }).catch((error) => {
            console.log(error);
            return null;
          }),
        );
      }
      history.insertedPayments = (await Promise.all(paymentPromises)).filter(
        Boolean,
      );
    }

    return {
      message: 'Controlled seed executed successfully',
      history: history as any,
    };
  }

  async clearDatabaseControlled(
    clearOptions: {
      users?: boolean;
      clients?: boolean;
      supplies?: boolean;
      shoppingSupplies?: boolean;
      suppliers?: boolean;
      consumptionSupplies?: boolean;
      harvests?: boolean;
      works?: boolean;
      crops?: boolean;
      employees?: boolean;
      sales?: boolean;
      payments?: boolean;
    } = {},
  ) {
    const {
      users = false,
      clients = false,
      supplies = false,
      shoppingSupplies = false,
      suppliers = false,
      consumptionSupplies = false,
      harvests = false,
      works = false,
      crops = false,
      employees = false,
      sales = false,
      payments = false,
    } = clearOptions;

    const clearPromises: Promise<void>[] = [];

    if (users) {
      clearPromises.push(this.usersService.deleteAllUsers());
    }

    if (clients) {
      clearPromises.push(this.clientsService.deleteAllClients());
    }

    if (supplies) {
      clearPromises.push(this.suppliesService.deleteAllStockSupplies());
      clearPromises.push(this.suppliesService.deleteAllSupplies());
    }

    if (shoppingSupplies) {
      clearPromises.push(this.shoppingService.deleteAllShoppingSupplies());
    }

    if (suppliers) {
      clearPromises.push(this.suppliersService.deleteAllSupplier());
    }

    if (consumptionSupplies) {
      clearPromises.push(
        this.consumptionsService.deleteAllConsumptionSupplies(),
      );
    }

    if (harvests) {
      clearPromises.push(this.harvestsService.deleteAllHarvest());
    }

    if (works) {
      clearPromises.push(this.workService.deleteAllWork());
    }

    if (crops) {
      clearPromises.push(this.cropsService.deleteAllCrops());
    }

    if (employees) {
      clearPromises.push(this.employeesService.deleteAllEmployees());
    }

    if (sales) {
      clearPromises.push(this.salesService.deleteAllSales());
    }

    if (payments) {
      clearPromises.push(this.paymentsService.deleteAllPayments());
    }

    await Promise.all(clearPromises);
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
      name: 'Crop ' + InformationGenerator.generateRandomId().substring(0, 5),
      description: InformationGenerator.generateDescription(),
      number_hectares: 12,
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
      number_hectares: crop.number_hectares,
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
          unit_of_measure: 'GRAMOS',
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
  }): Promise<HarvestProcessed> {
    const data: HarvestProcessedDto = {
      date: date,
      crop: { id: cropId },
      harvest: { id: harvestId },
      amount,
      unit_of_measure: 'GRAMOS',
    };

    const harvestProcessed =
      await this.harvestsService.createHarvestProcessed(data);

    return harvestProcessed;
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
          unit_of_measure: 'GRAMOS',
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
          unit_of_measure: 'GRAMOS',
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
          unit_of_measure: 'GRAMOS',
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
      name: 'Supply ' + InformationGenerator.generateRandomId().substring(0, 5),
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
    date = InformationGenerator.generateRandomDate({}),
    supplyId,
    cropId,
    amount = 2000,
  }: {
    supplyId?: string;
    cropId?: string;
    amount?: number;
    date?: string;
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
    } else {
      supply = await this.suppliesService.findOne(supplyId);
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
          unit_of_measure:
            supply.unit_of_measure == 'GRAMOS' ? 'GRAMOS' : 'MILILITROS',
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
          unit_of_measure:
            supply.unit_of_measure == 'GRAMOS' ? 'GRAMOS' : 'MILILITROS',
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
    let supply;
    const supplier = (await this.CreateSupplier({})) as Supplier;
    if (!supplyId) {
      supply = (await this.CreateSupply({})) as Supply;
    } else {
      supply = await this.suppliesService.findOne(supplyId);
    }

    const data: ShoppingSuppliesDto = {
      date: InformationGenerator.generateRandomDate({}),
      value_pay: valuePay,
      details: [
        {
          supply: { id: supplyId || supply.id },
          supplier: { id: supplier.id },
          amount,
          value_pay: valuePay,
          unit_of_measure:
            supply.unit_of_measure == 'GRAMOS' ? 'GRAMOS' : 'MILILITROS',
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
          unit_of_measure:
            supply.unit_of_measure === 'GRAMOS' ? 'GRAMOS' : 'MILILITROS',
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
    employeeId: string;
    methodOfPayment?: MethodOfPayment;
    worksId: string[];
    harvestsId: string[];
    value_pay: number;
  }): Promise<Payment> {
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
