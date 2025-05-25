import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { UserActions } from './user-actions.entity';
import { RoleUser } from '../types/role-user.type';

@Entity({ name: 'users' })
export class User extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, select: false })
  password: string;

  @Column('jsonb', {
    default: ['user'],
  })
  roles: RoleUser[];

  @Column('bool', { default: true })
  is_active: boolean;

  @OneToMany(() => UserActions, (userActions) => userActions.user, {
    cascade: true,
  })
  actions: UserActions[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }
}
