import { Client } from 'src/clients/entities/client.entity';
import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Sale } from './sale.entity';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';

@Entity({ name: 'sales_detail' })
export class SaleDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      // Unidades de masa
      'GRAMOS',
      'KILOGRAMOS',
      'LIBRAS',
      'ONZAS',
      'TONELADAS',
    ],
  })
  unit_of_measure: MassUnit;

  @Column({
    type: 'int4',
  })
  amount: number;

  @Column({
    type: 'int4',
  })
  value_pay: number;

  @ManyToOne(() => Sale, (sale) => sale.details, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  sale: Sale;

  @ManyToOne(() => Crop, (crop) => crop.sales_detail, {
    onDelete: 'CASCADE',
  })
  crop: Crop;

  @ManyToOne(() => Client, (client) => client.sales_detail, {
    onDelete: 'CASCADE',
  })
  client: Client;

  @Column({
    type: 'bool',
    default: false,
  })
  is_receivable: boolean;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
