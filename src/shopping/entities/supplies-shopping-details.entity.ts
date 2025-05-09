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

@Entity({ name: 'supplies_shopping_details' })
export class SuppliesShoppingDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int4',
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
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplies_shopping_details, {
    onDelete: 'CASCADE',
  })
  supplier: Supplier;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
