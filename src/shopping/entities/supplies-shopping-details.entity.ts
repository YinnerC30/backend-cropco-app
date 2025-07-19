import { Supplier } from 'src/suppliers/entities/supplier.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SuppliesShopping } from './supplies-shopping.entity';
import { Supply } from 'src/supplies/entities';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

@Entity({ name: 'supplies_shopping_details' })
export class SuppliesShoppingDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'float8',
  })
  amount: number;

  @Column({
    type: 'int4',
  })
  value_pay: number;

  // Internal relations
  @ManyToOne(
    () => SuppliesShopping,
    (shopping: SuppliesShopping) => shopping.details,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'shoppingId' })
  shopping: SuppliesShopping;

  @ManyToOne(() => Supply, (supply) => supply.shopping_details, {
    onDelete: 'CASCADE',
  })
  // @JoinColumn()
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplies_shopping_details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  supplier: Supplier;

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

  // @Column({ type: 'varchar', length: 500, nullable: true })
  // observation: string;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
