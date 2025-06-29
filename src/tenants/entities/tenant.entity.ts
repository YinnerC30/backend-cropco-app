import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantDatabase } from './tenant-database.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_name: string;

  @Column()
  email: string;

  @Column({ unique: true })
  subdomain: string;

  @Column({ nullable: true })
  cell_phone_number: string;

  @Column({ default: false })
  is_created_db: boolean;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => TenantDatabase, (database) => database.tenant, {
    cascade: true,
  })
  databases: TenantDatabase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
