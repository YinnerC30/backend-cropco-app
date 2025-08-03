import { Crop } from 'src/crops/entities/crop.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Harvest } from './harvest.entity';
import {
  MassUnit,
  UnitType,
} from 'src/common/unit-conversion/unit-conversion.service';
import { MassUnitDto } from 'src/common/utils/UnitTypesDto';

@Entity('harvests_processed')
export class HarvestProcessed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: string;

  @ManyToOne(() => Crop, (crop) => crop.harvests_processed, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cropId' })
  crop: Crop;

  @ManyToOne(() => Harvest, (harvest) => harvest.processed, {
    onDelete: 'CASCADE',
  })
  harvest: Harvest;

  @Column({
    type: 'enum',
    enum: MassUnitDto
  })
  unit_of_measure: MassUnit;

  @Column({ type: 'float8' })
  amount: number;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
