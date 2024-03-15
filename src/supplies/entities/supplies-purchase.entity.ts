import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesPurchaseDetails } from './supplies-purchase-details.entity';

@Entity({ name: 'supplies_purchase' })
export class SuppliesPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;
  @Column({
    type: 'int4',
  })
  total: number;

  // External relations

  @OneToMany(
    () => SuppliesPurchaseDetails,
    (details) => details.supplies_purchase,
    { eager: true, cascade: true },
  )
  details: SuppliesPurchaseDetails[];
}
