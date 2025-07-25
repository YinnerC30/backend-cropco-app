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

import { SuppliesConsumptionDetails } from 'src/consumptions/entities/supplies-consumption-details.entity';

import { SuppliesStock } from './supplies-stock.entity';
import { SuppliesShoppingDetails } from 'src/shopping/entities';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

@Entity({ name: 'supplies' })
export class Supply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({
    type: 'enum',
    enum: [
      // Unidades de masa
      'GRAMOS',
      'KILOGRAMOS',
      'LIBRAS',
      'ONZAS',
      'TONELADAS',
      // Unidades de volumen
      'MILILITROS',
      'LITROS',
      'GALONES',
      // Longitud
      'MILIMETROS',
      'CENTIMETROS',
      'METROS',
    ],
  })
  unit_of_measure: UnitType;

  @Column({ type: 'varchar', length: 500 })
  observation: string;

  // External relations

  @OneToMany(
    () => SuppliesShoppingDetails,
    (shopping_details) => shopping_details.supply,
    { cascade: ['insert', 'update'] },
  )
  shopping_details: SuppliesShoppingDetails[];

  @OneToOne(() => SuppliesStock, (stock) => stock.supply, { cascade: true })
  stock: SuppliesStock;

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (consumption_details) => consumption_details.supply,
    { cascade: ['insert', 'update'] },
  )
  consumption_details: SuppliesConsumptionDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
