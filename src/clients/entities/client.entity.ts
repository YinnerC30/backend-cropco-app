import { ApiProperty } from '@nestjs/swagger';
import { PersonalInformation } from 'src/common/entities/personal-information.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'clients' })
export class Client extends PersonalInformation {
  @ApiProperty({
    description: 'Identificador único del cliente',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Dirección del cliente',
    example: 'Calle Falsa 123, Ciudad, País',
    maxLength: 200,
  })
  @Column({ type: 'varchar', length: 200 })
  address: string;

  // External relations
  @ApiProperty({
    description: 'Detalles de las ventas asociadas con el cliente',
    type: () => [SaleDetails],
  })
  @OneToMany(() => SaleDetails, (sales_detail) => sales_detail.client, {
    cascade: true,
  })
  sales_detail: SaleDetails[];
}
