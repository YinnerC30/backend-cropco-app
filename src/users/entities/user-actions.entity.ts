import {
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ModuleActions } from 'src/auth/entities/module-actions.entity';

@Entity({ name: 'user_actions' })
export class UserActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.actions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(
    () => ModuleActions,
    (moduleActions) => moduleActions.users_actions,
    { onDelete: 'CASCADE' },
  )
  action: ModuleActions;
}
