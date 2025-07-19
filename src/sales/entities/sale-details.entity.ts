import { Client } from 'src/clients/entities/client.entity';
import { MassUnit } from 'src/common/unit-conversion/unit-conversion.service';
import { MassUnitDto } from 'src/common/utils/UnitTypesDto';
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

@Entity({ name: 'sales_detail' })
export class SaleDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MassUnitDto,
  })
  unit_of_measure: MassUnit;

  @Column({
    type: 'float8',
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
