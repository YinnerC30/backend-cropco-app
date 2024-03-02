import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type UnitOfMeasure = 'GRAMOS' | 'MILILITROS';

@Entity()
export class Supply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  brand: string;

  @Column({ type: 'enum', enum: ['GRAMOS', 'MILILITROS'] })
  unit_of_measure: UnitOfMeasure;

  @Column({ type: 'varchar', length: 500 })
  observation: string;
}
