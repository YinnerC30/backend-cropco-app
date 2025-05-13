import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('harvests_stock')
export class HarvestStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Crop, (crop) => crop.harvests_stock, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  @Column({ type: 'int4' })
  amount: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
