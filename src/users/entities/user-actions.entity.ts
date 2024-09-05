import { Entity, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { ModuleActions } from 'src/auth/entities/module-actions.entity';

@Entity({ name: 'user_actions' })
export class UserActions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.actions)
  user: User;

  @ManyToMany(
    () => ModuleActions,
    (moduleActions) => moduleActions.users_actions,
  )
  actions: ModuleActions[];
}
