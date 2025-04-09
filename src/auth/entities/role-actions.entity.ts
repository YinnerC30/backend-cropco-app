import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { ModuleActions } from 'src/auth/entities/module-actions.entity';
import { Role } from './role.entity';

@Entity({ name: 'role_actions' })
export class RoleActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Role, (role) => role.actions)
  rol: Role;

  @ManyToOne(() => ModuleActions, (moduleActions) => moduleActions.roles_actions)
  action: ModuleActions;
}
