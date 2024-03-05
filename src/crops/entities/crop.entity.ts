import { Harvest } from 'src/harvest/entities/harvest.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Crop {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;
  @Column({ type: 'varchar', length: 500 })
  description: string;
  @Column({ type: 'int4' })
  units: number;
  @Column({ type: 'varchar', length: 500 })
  location: string;
  @Column({ type: 'date' })
  date_of_creation: string;
  @Column({ type: 'date' })
  date_of_termination: string;

  @OneToMany(() => Harvest, (harvest) => harvest.crop)
  harvests: Harvest[];
}
