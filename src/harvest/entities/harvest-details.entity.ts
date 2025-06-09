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

import { Employee } from 'src/employees/entities/employee.entity';
import { PaymentsHarvest } from 'src/payments/entities/payment-harvest.entity';
import { Harvest } from './harvest.entity';
import { UnitType } from 'src/common/unit-conversion/unit-conversion.service';

@Entity({ name: 'harvests_detail' })
export class HarvestDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: [
      // Unidades de masa
      'GRAMOS',
      'KILOGRAMOS',
      'LIBRAS',
      'ONZAS',
      'TONELADAS',
      // Unidades de volumen
      'MILILITROS',
      'LITROS',
      'GALONES',
      'ONZAS_FLUIDAS',
      'CUCHARADAS',
      'CUCHARADAS_SOPERAS',
    ],
  })
  unit_of_measure: UnitType;

  @Column({ type: 'int4' })
  amount: number;

  @Column({ type: 'int4' })
  value_pay: number;

  @Column({ type: 'bool', default: true })
  payment_is_pending: boolean;

  // Relación con Harvest
  @ManyToOne(() => Harvest, (harvest) => harvest.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'harvestId' })
  harvest: Harvest;

  // Relación con Employee
  @ManyToOne(() => Employee, (employee) => employee.harvests_detail, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  // Relación con PaymentHarvest
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
