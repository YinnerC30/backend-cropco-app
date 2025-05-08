import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentsHarvest } from 'src/payments/entities/payment-harvest.entity';
import { Harvest } from './harvest.entity';

@Entity({ name: 'harvests_detail' })
export class HarvestDetails {
  @ApiProperty({
    description: 'ID único de los detalles de la cosecha',
    example: '123e4567-e89b-12d3-a456-426614174000',
    uniqueItems: true,
    readOnly: true,
    default: 'UUID auto generado',
    format: 'uuid',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Cantidad total asociada a estos detalles',
    example: 100,
    type: Number,
  })
  @Column({ type: 'int4' })
  amount: number;

  @ApiProperty({
    description: 'Valor de pago asociado a estos detalles',
    example: 500,
    type: Number,
  })
  @Column({ type: 'int4' })
  value_pay: number;

  @ApiProperty({
    description: 'Indica si el pago está pendiente para estos detalles',
    example: true,
    type: Boolean,
  })
  @Column({ type: 'bool', default: true })
  payment_is_pending: boolean;

  // Relación con Harvest
  @ApiProperty({
    description: 'Cosecha asociada a estos detalles',
    type: () => Harvest,
  })
  @ManyToOne(() => Harvest, (harvest) => harvest.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'harvestId' })
  harvest: Harvest;

  // Relación con Employee
  @ApiProperty({
    description: 'Empleado asociado a estos detalles',
    type: () => Employee,
  })
  @ManyToOne(() => Employee, (employee) => employee.harvests_detail, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  // Relación con PaymentHarvest
  @ApiProperty({
    description: 'Detalles de pagos asociados a estos detalles de la cosecha',
    type: () => PaymentsHarvest,
  })
  @OneToOne(
    () => PaymentsHarvest,
    (payments_harvest) => payments_harvest.harvests_detail,
    { cascade: true },
  )
  payments_harvest: PaymentsHarvest;

  @CreateDateColumn()
  createdDate: Date;

  @UpdateDateColumn()
  updatedDate: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
