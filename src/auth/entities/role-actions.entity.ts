import { Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ModuleActions } from 'src/auth/entities/module-actions.entity';
import { Role } from './role.entity';

@Entity({ name: 'role_actions' })
export class RoleActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.actions)
  rol: Role;

  @ManyToMany(
    () => ModuleActions,
    (moduleActions) => moduleActions.rols_actions,
  )
  actions: ModuleActions[];
}
