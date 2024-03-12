import { HarvestStock } from 'src/harvest/entities/harvest-stock.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';
import { SuppliesConsumptionDetails } from 'src/supplies/entities/supplies-consumption-details.entity';
import { SuppliesConsumption } from 'src/supplies/entities/supplies-consumption.entity';
import { Work } from 'src/work/entities/work.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
  @Column({ type: 'varchar', length: 500 })
  description: string;
  @Column({ type: 'int4' })
  units: number;
  @Column({ type: 'varchar', length: 500 })
  location: string;
  @Column({ type: 'date' })
  date_of_creation: string;
  @Column({ type: 'date' })
  date_of_termination: string;

  // External relations

  @OneToMany(() => Harvest, (harvest) => harvest.crop, { cascade: true })
  harvests: Harvest[];

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (suppliesConsumptionDetails) => suppliesConsumptionDetails.crop,
    { cascade: true },
  )
  suppliesConsumptionDetails: SuppliesConsumptionDetails[];

  @OneToMany(() => Work, (work) => work.crop, { cascade: true })
  works: Work[];

  @OneToMany(() => SaleDetails, (saleDetails) => saleDetails.crop, {
    cascade: true,
  })
  saleDetails: SaleDetails[];
}
