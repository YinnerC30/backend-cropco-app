import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SaleDetails } from './sale-details.entity';

@Entity()
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;

  @Column({
    type: 'int4',
  })
  quantity: number;

  @Column({
    type: 'int4',
  })
  total: number;
  @Column({
    type: 'bool',
  })
  is_receivable: boolean;

  // External relations

  @OneToMany(() => SaleDetails, (saleDetails) => saleDetails.sale, {
    cascade: true,
  })
  details: SaleDetails[];
}
