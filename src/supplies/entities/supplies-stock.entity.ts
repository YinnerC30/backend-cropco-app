import { Supply } from 'src/supplies/entities/supply.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
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
}
