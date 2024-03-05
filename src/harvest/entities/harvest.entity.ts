import { Crop } from 'src/crops/entities/crop.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export type UnitOfMeasure = 'KILOGRAMOS' | 'LIBRAS';

@Entity()
export class Harvest {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({
    type: 'date',
  })
  date: string;

  @ManyToOne(() => Crop, (crop) => crop.harvests, { nullable: false })
  crop: Crop;

  @Column({ type: 'enum', enum: ['KILOGRAMOS', 'LIBRAS'] })
  unit_of_measure: UnitOfMeasure;

  @Column({ type: 'int4' })
  total: number;

  @Column({ type: 'int4' })
  value_pay: number;

  @Column({ type: 'varchar', length: 500 })
  observation: string;
}
