import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliesPurchaseDetails } from './supplies-purchase-details.entity';
import { SuppliesStock } from './supplies-stock.entity';
import { SuppliesConsumptionDetails } from './supplies-consumption-details.entity';

export type UnitOfMeasure = 'GRAMOS' | 'MILILITROS';

@Entity({ name: 'supplies' })
export class Supply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'enum', enum: ['GRAMOS', 'MILILITROS'] })
  unit_of_measure: UnitOfMeasure;

  @Column({ type: 'varchar', length: 500 })
  observation: string;

  // External relations

  @OneToMany(
    () => SuppliesPurchaseDetails,
    (purchase_details) => purchase_details.supply,
    { cascade: true },
  )
  purchase_details: SuppliesPurchaseDetails[];

  @OneToOne(() => SuppliesStock)
  stock: SuppliesStock;

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (consumption_details) => consumption_details.supply,
    { cascade: true },
  )
  consumption_details: SuppliesConsumptionDetails[];
}
