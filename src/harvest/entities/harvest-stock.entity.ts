import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('harvests_stock')
export class HarvestStock {
  @ApiProperty({
    description: 'ID único del stock de cosecha',
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
    description: 'Cultivo asociado al stock de cosecha',
    type: () => Crop,
  })
  @OneToOne(() => Crop, (crop) => crop.harvests_stock, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  @ApiProperty({
    description: 'Cantidad total en el stock de cosecha',
    example: 100,
    type: Number,
  })
  @Column({ type: 'int4' })
  total: number;
}
