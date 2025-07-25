import { SuppliesConsumptionDetails } from 'src/consumptions/entities/supplies-consumption-details.entity';
import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { HarvestStock } from 'src/harvest/entities/harvest-stock.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';

import { Work } from 'src/work/entities/work.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'crops' })
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'float' })
  number_hectares: number;

  @Column({ type: 'float' })
  units: number;

  @Column({ type: 'text' })
  location: string;

  @Column({ type: 'date', name: 'date_of_creation' })
  date_of_creation: string;

  @Column({ type: 'date', name: 'date_of_termination', nullable: true })
  date_of_termination: string;

  // External relations

  @OneToOne(() => HarvestStock, (harvests_stock) => harvests_stock.crop, {
    cascade: true,
  })
  harvests_stock: HarvestStock;

  @OneToMany(
    () => HarvestProcessed,
    (harvests_processed) => harvests_processed.crop,
    {
      cascade: ['insert', 'update'],
    },
  )
  harvests_processed: HarvestProcessed[];

  @OneToMany(() => Harvest, (harvest) => harvest.crop, {
    cascade: ['insert', 'update'],
  })
  harvests: Harvest[];

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (supplies_consumption_details) => supplies_consumption_details.crop,
    { cascade: ['insert', 'update'] },
  )
  supplies_consumption_details: SuppliesConsumptionDetails[];

  @OneToMany(() => Work, (work) => work.crop, { cascade: ['insert', 'update'] })
  works: Work[];

  @OneToMany(() => SaleDetails, (sales_detail) => sales_detail.crop, {
    cascade: ['insert', 'update'],
  })
  sales_detail: SaleDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
