import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesShoppingDetails } from './supplies-shopping-details.entity';

@Entity({ name: 'supplies_shopping' })
export class SuppliesShopping {
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

  @OneToMany(() => SuppliesShoppingDetails, (details) => details.shopping, {
    cascade: true,
  })
  details: SuppliesShoppingDetails[];
}
