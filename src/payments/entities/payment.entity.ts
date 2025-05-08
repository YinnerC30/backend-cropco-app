import { ApiProperty } from '@nestjs/swagger';
import { Employee } from 'src/employees/entities/employee.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentsHarvest } from './payment-harvest.entity';
import { PaymentsWork } from './payment-work.entity';

export enum MethodOfPayment {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  INTERCAMBIO = 'INTERCAMBIO',
}

@Entity({ name: 'payments' })
export class Payment {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único del pago',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '2023-07-21', description: 'Fecha del pago' })
  @Column({ type: 'date' })
  date: string;

  @ApiProperty({
    type: () => Employee,
    description: 'Empleado asociado al pago',
  })
  @ManyToOne(() => Employee, (employee) => employee.payments, {
    onDelete: 'CASCADE',
  })
  employee: Employee;

  @ApiProperty({
    enum: MethodOfPayment,
    example: MethodOfPayment.EFECTIVO,
    description: 'Método de pago utilizado',
  })
  @Column({ type: 'enum', enum: MethodOfPayment })
  method_of_payment: MethodOfPayment;

  @ApiProperty({ example: 1000, description: 'Total del pago' })
  @Column({ type: 'int4' })
  value_pay: number;

  @ApiProperty({
    type: () => [PaymentsHarvest],
    description: 'Pagos de cosecha asociados',
  })
  @OneToMany(
    () => PaymentsHarvest,
    (payments_harvest) => payments_harvest.payment,
    {
      cascade: true,
    },
  )
  payments_harvest: PaymentsHarvest[];

  @ApiProperty({
    type: () => [PaymentsWork],
    description: 'Pagos de trabajo asociados',
  })
  @OneToMany(() => PaymentsWork, (payments_work) => payments_work.payment, {
    cascade: true,
  })
  payments_work: PaymentsWork[];

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
