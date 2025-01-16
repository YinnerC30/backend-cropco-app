import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Crop } from 'src/crops/entities/crop.entity';
import { HarvestDetails } from './harvest-details.entity';
import { HarvestProcessed } from './harvest-processed.entity';
import { ApiProperty } from '@nestjs/swagger';

export type UnitOfMeasure = 'KILOGRAMOS' | 'LIBRAS';

@Entity({ name: 'harvests' })
export class Harvest {
  @ApiProperty({
    description: 'ID único de la cosecha',
    example: '123e4567-e89b-12d3-a456-426614174000',
    uniqueItems: true,
    readOnly: true,
    default: 'UUID auto generado',
    format: 'uuid',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Fecha de la cosecha',
    format: 'date',
    example: '2024-07-11',
    type: String,
  })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({
    description: 'Cantidad total cosechada',
    example: 100,
    type: Number,
  })
  @Column({ type: 'int4' })
  total: number;

  @ApiProperty({
    description: 'Valor de pago por la cosecha',
    example: 500,
    type: Number,
  })
  @Column({ type: 'int4' })
  value_pay: number;

  @ApiProperty({
    description: 'Observaciones adicionales',
    maxLength: 500,
    type: Number,
  })
  @Column({ type: 'varchar', length: 500 })
  observation: string;

  // Relación con Crop
  @ApiProperty({
    description: 'Cultivo asociado a la cosecha',
    type: () => Crop,
  })
  @ManyToOne(() => Crop, (crop) => crop.harvests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  // Relación con HarvestDetails
  @ApiProperty({
    description: 'Detalles específicos de la cosecha',
    type: () => [HarvestDetails],
  })
  @OneToMany(() => HarvestDetails, (details) => details.harvest, {
    cascade: true,
  })
  details: HarvestDetails[];

  // Relación con HarvestProcessed
  @ApiProperty({
    description: 'Procesos asociados a la cosecha',
    type: () => [HarvestProcessed],
  })
  @OneToMany(() => HarvestProcessed, (processed) => processed.harvest, {
    cascade: true,
  })
  processed: HarvestProcessed[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
