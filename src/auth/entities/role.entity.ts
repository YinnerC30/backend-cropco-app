import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { RoleActions } from './role-actions.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @OneToMany(() => RoleActions, (roleActions) => roleActions.rol)
  actions: RoleActions[];
}
