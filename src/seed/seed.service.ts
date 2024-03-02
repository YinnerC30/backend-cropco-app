import { Injectable } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { initialData } from './data/seed-data';
import { CropsService } from 'src/crops/crops.service';

@Injectable()
export class SeedService {
  constructor(
    private readonly usersService: UsersService,
    private readonly cropsService: CropsService,
  ) {}

  async runSeed() {
    await this.insertNewUsers();
    await this.insertNewCrops();

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
}
