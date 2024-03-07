import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { DataSource, Repository } from 'typeorm';
import { Supply } from './entities/supply.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePurchaseSuppliesDto } from './dto/create-purchase-supplies.dto';
import { SuppliesPurchase } from './entities/supplies-purchase.entity';
import { SuppliesPurchaseDetails } from './entities/supplies-purchase-details.entity';
import { SuppliesStock } from './entities/supplies-stock.entity';

@Injectable()
export class SuppliesService {
  private readonly logger = new Logger('SuppliesService');
  constructor(
    @InjectRepository(Supply)
    private readonly supplyRepository: Repository<Supply>,
    @InjectRepository(SuppliesPurchase)
    private readonly suppliesPurchaseRepository: Repository<SuppliesPurchase>,
    @InjectRepository(SuppliesPurchaseDetails)
    private readonly suppliesPurchaseDetailsRepository: Repository<SuppliesPurchaseDetails>,
    @InjectRepository(SuppliesStock)
    private readonly suppliesStockRepository: Repository<SuppliesStock>,
    private dataSource: DataSource,
  ) {}

  async create(createSupply: CreateSupplyDto) {
    try {
      const supply = this.supplyRepository.create(createSupply);
      await this.supplyRepository.save(supply);
      return supply;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.supplyRepository.find({
      order: {
        name: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOne(id: string) {
    const supply = await this.supplyRepository.findOneBy({ id });
    if (!supply) throw new NotFoundException(`Supply with id: ${id} not found`);
    return supply;
  }

  async update(id: string, updateSupplyDto: UpdateSupplyDto) {
    await this.findOne(id);
    await this.supplyRepository.update(id, updateSupplyDto);
  }

  async remove(id: string) {
    const supply = await this.findOne(id);
    await this.supplyRepository.remove(supply);
  }

  async deleteAllSupplies() {
    const supply = this.supplyRepository.createQueryBuilder('supply');
    try {
      await supply.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods purchase supplies

  async createPurchase(createPurchaseSuppliesDto: CreatePurchaseSuppliesDto) {
    // Crear e iniciar la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { details, ...rest } = createPurchaseSuppliesDto;

      // Validar valores numéricos
      // const totalHarvest = rest.total;
      // const valuePay = rest.value_pay;

      // const totalArray = harvest_details.reduce((acumulador, record) => {
      //   return acumulador + record.total;
      // }, 0);

      // const valuePayArray = harvest_details.reduce((acumulador, record) => {
      //   return acumulador + record.value_pay;
      // }, 0);

      // const isTotalValid = totalHarvest === totalArray;
      // const isValuePayValid = valuePay === valuePayArray;

      // if (!(isTotalValid && isValuePayValid)) {
      //   return;
      // TODO: Retornar excepción personalizada
      // }

      // Guardar compra
      const purchase = queryRunner.manager.create(SuppliesPurchase, {
        ...rest,
      });
      const { id } = await queryRunner.manager.save(purchase);

      // Guardar detalles de cosecha
      const arrayPromises = [];

      for (const register of details) {
        const registerToSave = queryRunner.manager.create(
          SuppliesPurchaseDetails,
          {
            purchase: id,
            ...register,
          },
        );

        arrayPromises.push(queryRunner.manager.save(registerToSave));
      }

      await Promise.all(arrayPromises);

      // Agregar insumo al stock de

      for (const item of details) {
        const { amount } = item;

        const stockRegister = await this.suppliesStockRepository
          .createQueryBuilder('supplyStock')
          .where(`supplyStock.supplyId = '${item.supply}'`)
          .getOne();

        if (!stockRegister) {
          const supplyStock = queryRunner.manager.create(SuppliesStock, {
            ...item,
            amount: 0,
          });

          await queryRunner.manager.save(supplyStock);
        }

        await queryRunner.manager.increment(
          SuppliesStock,
          { supply: item.supply },
          'amount',
          amount,
        );
      }

      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAllPurchases(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    return this.suppliesPurchaseRepository.find({
      order: {
        date: 'ASC',
      },
      take: limit,
      skip: offset,
    });
  }

  async findOnePurchase(id: string) {
    const supplyPurchase = await this.suppliesPurchaseRepository.findOne({
      where: { id },
    });
    if (!supplyPurchase)
      throw new NotFoundException(`Supplies Purchase with id: ${id} not found`);
    return supplyPurchase;
  }

  // TODO: Implementar método actualizar compra

  async removePurchase(id: string) {
    const purchaseSupply: any = await this.findOnePurchase(id);

    const { details } = purchaseSupply;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete PurchaseDetails
      await queryRunner.manager.delete(SuppliesPurchaseDetails, {
        purchase: id,
      });

      // Decrement stock
      for (const record of details) {
        const { supply } = record;
        await queryRunner.manager.decrement(
          SuppliesStock,
          {
            supply: supply.id,
          },
          'amount',
          record.amount,
        );
      }
      // Delete Purchase
      await queryRunner.manager.remove(purchaseSupply);

      await queryRunner.commitTransaction();
      // await queryRunner.rollbackTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleDBExceptions(error);
    } finally {
      await queryRunner.release();
    }
  }

  async deleteAllPurchaseSupplies() {
    const purchase =
      this.suppliesPurchaseRepository.createQueryBuilder('purchase');
    const purchaseDetails =
      this.suppliesPurchaseDetailsRepository.createQueryBuilder(
        'purchaseDetails',
      );
    const suppliesStock =
      this.suppliesStockRepository.createQueryBuilder('suppliesStock');

    try {
      await suppliesStock.delete().where({}).execute();
      await purchaseDetails.delete().where({}).execute();
      await purchase.delete().where({}).execute();
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Methods to consumption Supplies

  // TODO: Implementar todos los métodos para consumption

  async createConsumption() {
    return 'Consumption Successful';
  }

  private handleDBExceptions(error: any) {
    console.log(error);
    if (error.code === '23503') throw new BadRequestException(error.detail);
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
