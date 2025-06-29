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

@Entity('tenant_databases')
export class TenantDatabase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  database_name: string;

  // @Column({ default: true })
  // is_active: boolean;

  @Column({ type: 'jsonb', nullable: true })
  connection_config: {
    host: string;
    port: number;
    username: string;
    password: string;
  };

  @ManyToOne(() => Tenant, (tenant) => tenant.databases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({ default: false })
  is_migrated: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
