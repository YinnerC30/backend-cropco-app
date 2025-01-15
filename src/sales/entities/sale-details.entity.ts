import { ApiProperty } from '@nestjs/swagger';
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

@Entity({ name: 'sales_detail' })
export class SaleDetails {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del detalle de venta',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad de items en este detalle de venta',
  })
  @Column({
    type: 'int4',
  })
  quantity: number;

  @ApiProperty({
    example: 100,
    description: 'Monto total de este detalle de venta',
  })
  @Column({
    type: 'int4',
  })
  total: number;

  @ApiProperty({
    type: () => Sale,
    description: 'Venta asociada a este detalle',
  })
  @ManyToOne(() => Sale, (sale) => sale.details, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  sale: Sale;

  @ApiProperty({
    type: () => Crop,
    description: 'Cultivo asociado a este detalle de venta',
  })
  @ManyToOne(() => Crop, (crop) => crop.sales_detail, {
    onDelete: 'CASCADE',
  })
  crop: Crop;

  @ApiProperty({
    type: () => Client,
    description: 'Cliente asociado a este detalle de venta',
  })
  @ManyToOne(() => Client, (client) => client.sales_detail, {
    onDelete: 'CASCADE',
  })
  client: Client;

  @ApiProperty({
    example: false,
    description: 'Indica si la venta es a crédito',
  })
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
