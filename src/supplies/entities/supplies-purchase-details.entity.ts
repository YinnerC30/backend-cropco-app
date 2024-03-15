import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliesPurchase } from './supplies-purchase.entity';
import { Supply } from './supply.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';

@Entity({ name: 'supplies_purchase_details' })
export class SuppliesPurchaseDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int4',
  })
  amount: number;
  @Column({
    type: 'int4',
  })
  total: number;

  // Internal relations
  @ManyToOne(
    () => SuppliesPurchase,
    (supplies_purchase) => supplies_purchase.details,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'purchaseId' })
  supplies_purchase: SuppliesPurchase;

  @ManyToOne(() => Supply, (supply) => supply.purchase_details, {
    eager: true,
    onDelete: 'CASCADE',
  })
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplies_purchase_details, {
    eager: true,
    onDelete: 'CASCADE',
  })
  supplier: Supplier;
}
