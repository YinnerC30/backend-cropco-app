import { ApiProperty } from '@nestjs/swagger';
import { HarvestProcessed } from 'src/harvest/entities/harvest-processed.entity';
import { HarvestStock } from 'src/harvest/entities/harvest-stock.entity';
import { Harvest } from 'src/harvest/entities/harvest.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';
import { SuppliesConsumptionDetails } from 'src/supplies/entities/supplies-consumption-details.entity';
import { Work } from 'src/work/entities/work.entity';
import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'crops' })
export class Crop {
  @ApiProperty({
    example: 'b57b302e-74a1-47e3-8fbb-d56454f61bec',
    description: 'El ID del cultivo',
    uniqueItems: true,
    readOnly: true,
    default: 'UUID auto generado',
    type: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Café',
    description: 'Nombre del cultivo',
    uniqueItems: true,
    minLength: 4,
    maxLength: 100,
    type: 'string',
  })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @ApiProperty({
    example: 'El cultivo requiere cuidados en...',
    description: 'Información de utilidad sobre el cultivo',
    maxLength: 500,
    type: 'string',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    example: 100,
    description: 'Número de unidades de arboles/plantas del cultivo',
    minimum: 1,
    type: 'integer',
  })
  @Column({ type: 'int4' })
  units: number;

  @ApiProperty({
    example: '42.3601° N, 71.0589° W',
    description: 'Ubicación del cultivo',
    minLength: 4,
    maxLength: 150,
    type: 'string',
  })
  @Column({ type: 'text' })
  location: string;

  @ApiProperty({
    example: '2021-03-01',
    description: 'Fecha en la que se creo el cultivo',
    type: 'date',
  })
  @Column({ type: 'date', name: 'date_of_creation' })
  date_of_creation: string;

  @ApiProperty({
    example: '2023-07-18',
    description: 'Fecha en la que se termino/elimino el cultivo',
    type: 'date',
  })
  @Column({ type: 'date', name: 'date_of_termination', nullable: true })
  date_of_termination: string;

  // External relations

  @OneToOne(() => HarvestStock, (harvests_stock) => harvests_stock.crop, {
    cascade: true,
  })
  harvests_stock: HarvestStock;

  @OneToMany(
    () => HarvestProcessed,
    (harvests_processed) => harvests_processed.crop,
    {
      cascade: true,
    },
  )
  harvests_processed: HarvestProcessed[];

  @OneToMany(() => Harvest, (harvest) => harvest.crop, { cascade: true })
  harvests: Harvest[];

  @OneToMany(
    () => SuppliesConsumptionDetails,
    (supplies_consumption_details) => supplies_consumption_details.crop,
    { cascade: true },
  )
  supplies_consumption_details: SuppliesConsumptionDetails[];

  @OneToMany(() => Work, (work) => work.crop, { cascade: true })
  works: Work[];

  @OneToMany(() => SaleDetails, (saleDetails) => saleDetails.crop, {
    cascade: true,
  })
  sales_detail: SaleDetails[];
}
