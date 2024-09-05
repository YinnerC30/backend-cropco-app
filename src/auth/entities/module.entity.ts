import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ModuleActions } from './module-actions.entity';

@Entity('modules')
export class Module {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @OneToMany(() => ModuleActions, (actionsModule) => actionsModule.module, {
    cascade: true,
  })
  actions: ModuleActions[];
}
