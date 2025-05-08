import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';

@Entity({ name: 'payments_work' })
export class PaymentsWork {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del pago por trabajo',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    type: () => Payment,
    description: 'Pago asociado a este pago por trabajo',
  })
  @ManyToOne(() => Payment, (payment) => payment.payments_work, {
    onDelete: 'CASCADE',
  })
  payment: Payment;

  @ApiProperty({
    type: () => WorkDetails,
    description: 'Detalles del trabajo asociado a este pago',
  })
  @OneToOne(() => WorkDetails, (works_detail) => works_detail.payments_work, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  works_detail: WorkDetails;
}
