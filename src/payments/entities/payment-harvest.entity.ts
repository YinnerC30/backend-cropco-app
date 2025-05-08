import { ApiProperty } from '@nestjs/swagger';
import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

@Entity({ name: 'payments_harvest' })
export class PaymentsHarvest {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del pago por cosecha',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    type: () => Payment,
    description: 'Pago asociado a este pago por cosecha',
  })
  @ManyToOne(() => Payment, (payment) => payment.payments_harvest, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @ApiProperty({
    type: () => HarvestDetails,
    description: 'Detalles de la cosecha asociada a este pago',
  })
  @OneToOne(
    () => HarvestDetails,
    (harvests_detail) => harvests_detail.payments_harvest,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn()
  harvests_detail: HarvestDetails;
}
