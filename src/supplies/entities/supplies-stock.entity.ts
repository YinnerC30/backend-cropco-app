import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supply } from './supply.entity';

@Entity()
export class SuppliesStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Supply)
  @JoinColumn()
  supply: Supply;

  @Column({ type: 'int4' })
  amount: number;
}
