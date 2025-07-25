
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { WorkDetails } from './work-details.entity';
import { Crop } from 'src/crops/entities/crop.entity';

@Entity({ name: 'works' })
export class Work {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'date',
  })
  date: string;

  @Column({
    type: 'text',
  })
  description: string;

  @Column({
    type: 'int4',
  })
  value_pay: number;

  // Internal relations

  @ManyToOne(() => Crop, (crop) => crop.works, {
    onDelete: 'RESTRICT',
  })
  crop: Crop;

  // External relations

  @OneToMany(() => WorkDetails, (workDetails) => workDetails.work, {
    cascade: true,
  })
  details: WorkDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
