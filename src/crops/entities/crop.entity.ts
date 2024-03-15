import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { HarvestStock } from 'src/harvest/entities/harvest-stock.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';
import { SuppliesConsumptionDetails } from 'src/supplies/entities/supplies-consumption-details.entity';
import { Work } from 'src/work/entities/work.entity';
import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'crops' })
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int4' })
  units: number;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'date', name: 'date_of_creation' })
  date_of_creation: string;

  @Column({ type: 'date', name: 'date_of_termination' })
  date_of_termination: string;

  // External relations

  @OneToOne(() => HarvestStock, { cascade: true })
  harvests_stock: HarvestStock;

  @OneToMany(
    () => HarvestProcessed,
    (harvests_processed) => harvests_processed.crop,
    {
      cascade: true,
    },
  )
  harvests_processed: HarvestProcessed[];

  @OneToMany(() => Harvest, (harvest) => harvest.crop, { cascade: true })
  harvests: Harvest[];

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (supplies_consumption_details) => supplies_consumption_details.crop,
    { cascade: true },
  )
  supplies_consumption_details: SuppliesConsumptionDetails[];

  @OneToMany(() => Work, (work) => work.crop, { cascade: true })
  works: Work[];

  @OneToMany(() => SaleDetails, (saleDetails) => saleDetails.crop, {
    cascade: true,
  })
  sales_detail: SaleDetails[];
}
