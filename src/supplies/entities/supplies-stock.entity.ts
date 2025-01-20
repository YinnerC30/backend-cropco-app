import { Supply } from 'src/supplies/entities/supply.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'supplies_stock' })
export class SuppliesStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Supply, (supply) => supply.stock, { onDelete: 'CASCADE' })
  @JoinColumn()
  supply: Supply;

  @Column({ type: 'int4' })
  amount: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
