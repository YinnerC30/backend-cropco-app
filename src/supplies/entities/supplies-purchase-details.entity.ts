import { Supplier } from 'src/suppliers/entities/supplier.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SuppliesPurchase } from './supplies-purchase.entity';
import { Supply } from './supply.entity';

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
  @ManyToOne(() => SuppliesPurchase, (purchase) => purchase.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'purchaseId' })
  purchase: SuppliesPurchase;

  @ManyToOne(() => Supply, (supply) => supply.purchase_details, {
    onDelete: 'CASCADE',
  })
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.supplies_purchase_details, {
    onDelete: 'CASCADE',
  })
  supplier: Supplier;
}
