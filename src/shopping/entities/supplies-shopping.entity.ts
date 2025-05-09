import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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
  value_pay: number;

  // External relations

  @OneToMany(() => SuppliesShoppingDetails, (details) => details.shopping, {
    cascade: true,
  })
  details: SuppliesShoppingDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
