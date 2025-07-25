import { PersonalInformation } from '../../common/entities/personal-information.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SuppliesShoppingDetails } from 'src/shopping/entities';

@Entity({ name: 'suppliers' })
export class Supplier extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company_name: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  @OneToMany(
    () => SuppliesShoppingDetails,
    (supplies_shopping_details) => supplies_shopping_details.supplier,
    { cascade: ['insert', 'update'] },
  )
  supplies_shopping_details: SuppliesShoppingDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
