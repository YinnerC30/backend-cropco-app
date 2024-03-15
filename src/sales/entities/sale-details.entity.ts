import { Crop } from 'src/crops/entities/crop.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Sale } from './sale.entity';
import { Client } from 'src/clients/entities/client.entity';

@Entity({ name: 'sales_detail' })
export class SaleDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'int4',
  })
  quantity: number;

  @Column({
    type: 'int4',
  })
  total: number;

  // Internal relations
  @ManyToOne(() => Sale, (sale) => sale.details, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  sale: Sale;

  @ManyToOne(() => Crop, (crop) => crop.sales_detail, {
    onDelete: 'CASCADE',
    eager: true,
  })
  crop: Crop;

  @ManyToOne(() => Client, (client) => client.sales_detail, {
    onDelete: 'CASCADE',
    eager: true,
  })
  client: Client;
}
