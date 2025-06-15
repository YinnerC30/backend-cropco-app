import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { PersonalInformation } from 'src/common/entities/personal-information.entity';

@Entity('tenant_administrators')
export class TenantAdministrator extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'user', 'manager'],
    default: 'user',
  })
  role: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
