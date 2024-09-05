import { UserActions } from 'src/users/entities/user-actions.entity';
import { Module } from './module.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RoleActions } from './role-actions.entity';

@Entity('module_actions')
export class ModuleActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @ManyToOne(() => Module, (module) => module.actions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'moduleId' })
  module: Module;

  @ManyToMany(() => UserActions, (userActions) => userActions.actions)
  users_actions: UserActions[];

  @ManyToMany(() => RoleActions, (roleActions) => roleActions.actions)
  rols_actions: RoleActions[];
}
