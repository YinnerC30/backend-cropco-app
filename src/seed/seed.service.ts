import { Injectable } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { initialData } from './data/seed-data';
import { CropsService } from 'src/crops/crops.service';
import { EmployeesService } from 'src/employees/employees.service';
import { ClientsService } from 'src/clients/clients.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { SuppliesService } from 'src/supplies/supplies.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cropsService: CropsService,
    private readonly employeesService: EmployeesService,
    private readonly clientsService: ClientsService,
    private readonly suppliersService: SuppliersService,
    private readonly suppliesService: SuppliesService,
  ) {}

  async runSeed() {
    await this.insertNewUsers();
    await this.insertNewCrops();
    await this.insertNewEmployees();
    await this.insertNewClients();
    await this.insertNewSuppliers();
    await this.insertNewSupplies();

    return 'SEED EXECUTED';
  }

  private async insertNewUsers() {
    await this.usersService.deleteAllUsers();

    const Users = initialData.users;

    const insertPromises = [];

    Users.forEach((user) => {
      insertPromises.push(this.usersService.create(user));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewCrops() {
    await this.cropsService.deleteAllCrops();

    const crops = initialData.crops;

    const insertPromises = [];

    crops.forEach((crop) => {
      const { units, ...rest } = crop;
      insertPromises.push(
        this.cropsService.create({ units: Number(units), ...rest }),
      );
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewEmployees() {
    await this.employeesService.deleteAllEmployees();

    const employees = initialData.employees;

    const insertPromises = [];

    employees.forEach((employee) => {
      insertPromises.push(this.employeesService.create(employee));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewClients() {
    await this.clientsService.deleteAllClients();

    const clients = initialData.clients;

    const insertPromises = [];

    clients.forEach((client) => {
      insertPromises.push(this.clientsService.create(client));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewSuppliers() {
    await this.suppliersService.deleteAllSupplier();

    const suppliers = initialData.suppliers;

    const insertPromises = [];

    suppliers.forEach((supplier) => {
      insertPromises.push(this.suppliersService.create(supplier));
    });

    await Promise.all(insertPromises);

    return true;
  }
  private async insertNewSupplies() {
    await this.suppliesService.deleteAllSupplies();

    const supplies = initialData.supplies;

    const insertPromises = [];

    supplies.forEach((supply) => {
      insertPromises.push(this.suppliesService.create(supply));
    });

    await Promise.all(insertPromises);

    return true;
  }
}
