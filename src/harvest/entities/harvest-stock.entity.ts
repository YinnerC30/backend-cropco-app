import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('harvest_stock')
export class HarvestStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Crop, { nullable: false })
  @JoinColumn({ name: 'cropId' })
  cropId: string;

  @Column({
    type: 'int4',
  })
  total: number;
}
