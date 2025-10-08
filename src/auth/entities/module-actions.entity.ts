import { UserActions } from 'src/users/entities/user-actions.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Module } from './module.entity';
import { RoleActions } from './role-actions.entity';

@Entity('module_actions')
export class ModuleActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'none', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar', default: 'http://localhost', select: false })
  path_endpoint: string;

  @Column({ type: 'boolean', default: false })
  is_visible: boolean;

  @ManyToOne(() => Module, (module) => module.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'moduleId' })
  module: Module;

  @OneToMany(() => UserActions, (userActions) => userActions.action)
  users_actions: UserActions[];

  @OneToMany(() => RoleActions, (roleActions) => roleActions.action)
  roles_actions: RoleActions[];
}
