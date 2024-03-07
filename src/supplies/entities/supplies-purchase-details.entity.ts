import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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
  )
  purchase: SuppliesPurchase;

  @ManyToOne(() => Supply, (supply) => supply.purchaseDetails, { eager: true })
  supply: Supply;

  @ManyToOne(() => Supplier, (supplier) => supplier.purchaseSuppliesDetails, {
    eager: true,
  })
  supplier: Supplier;
}
