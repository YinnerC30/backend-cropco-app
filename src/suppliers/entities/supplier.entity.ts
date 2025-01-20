import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del proveedor',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Acme Inc.',
    description: 'Nombre de la empresa del proveedor',
    maxLength: 100,
    nullable: true,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  company_name: string;

  @ApiProperty({
    example: '123 Main St, Anytown, AN 12345',
    description: 'Dirección del proveedor',
    maxLength: 200,
  })
  @Column({ type: 'varchar', length: 200 })
  address: string;

  @ApiProperty({
    type: () => [SuppliesShoppingDetails],
    description:
      'Detalles de las compras de suministros realizadas a este proveedor',
  })
  @OneToMany(
    () => SuppliesShoppingDetails,
    (supplies_shopping_details) => supplies_shopping_details.supplier,
    { cascade: true },
  )
  supplies_shopping_details: SuppliesShoppingDetails[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
