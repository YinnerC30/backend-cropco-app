import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_databases')
export class TenantDatabase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  databaseName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  connectionConfig: {
    host: string;
    port: number;
    username: string;
    password: string;
  };

  @ManyToOne(() => Tenant, tenant => tenant.databases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column()
  tenantId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 