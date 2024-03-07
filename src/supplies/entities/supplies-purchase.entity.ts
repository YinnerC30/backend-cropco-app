import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesPurchaseDetails } from './supplies-purchase-details.entity';

@Entity()
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
    (suppliesPurchaseDetails) => suppliesPurchaseDetails.purchase,
    { eager: true },
  )
  details: SuppliesPurchaseDetails;
}
