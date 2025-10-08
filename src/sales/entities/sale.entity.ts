import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SaleDetails } from './sale-details.entity';

@Entity({ name: 'sales' })
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'date',
  })
  date: string;

  @Column({
    type: 'float8',
  })
  amount: number;

  @Column({
    type: 'int4',
  })
  value_pay: number;

  @OneToMany(() => SaleDetails, (details) => details.sale, {
    cascade: true,
  })
  details: SaleDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
