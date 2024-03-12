import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SuppliesPurchaseDetails } from 'src/supplies/entities/supplies-purchase-details.entity';

@Entity()
export class Supplier extends PersonalInformation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  company_name: string;

  @Column({ type: 'varchar', length: 200 })
  address: string;

  // External relations
  @OneToMany(
    () => SuppliesPurchaseDetails,
    (suppliesPurchaseDetails) => suppliesPurchaseDetails.supplier,
    { cascade: true },
  )
  purchaseSuppliesDetails: SuppliesPurchaseDetails[];
}
