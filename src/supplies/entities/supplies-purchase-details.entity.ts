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

@Entity()
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
    (suppliesPurchase) => suppliesPurchase.details,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'purchaseId' })
  purchase: SuppliesPurchase;

  @ManyToOne(() => Supply, (supply) => supply.purchaseDetails, {
    eager: true,
    onDelete: 'CASCADE',
  })
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseSuppliesDetails, {
    eager: true,
    onDelete: 'CASCADE',
  })
  supplier: Supplier;
}
