import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';

@Entity({ name: 'users' })
export class User extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, select: false })
  password: string;
}
