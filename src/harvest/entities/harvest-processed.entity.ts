import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Harvest } from './harvest.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('harvests_processed')
export class HarvestProcessed {
  @ApiProperty({
    description: 'ID único del procesamiento de cosecha',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Fecha de procesamiento de la cosecha',
    example: '2024-07-11',
  })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({
    description: 'Cultivo asociado al procesamiento de cosecha',
    type: () => Crop,
  })
  @ManyToOne(() => Crop, (crop) => crop.harvests_processed, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  @ApiProperty({
    description: 'Cosecha asociada al procesamiento',
    type: () => Harvest,
  })
  @ManyToOne(() => Harvest, (harvest) => harvest.processed, {
    onDelete: 'CASCADE',
  })
  harvest: Harvest;

  @ApiProperty({
    description: 'Cantidad total procesada',
    example: 100,
  })
  @Column({ type: 'int4' })
  total: number;
}
