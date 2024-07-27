import { HarvestDetails } from 'src/harvest/entities/harvest-details.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { Work } from 'src/work/entities/work.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { WorkDetails } from 'src/work/entities/work-details.entity';
import { ApiProperty } from '@nestjs/swagger';
@Entity({ name: 'employees' })
export class Employee extends PersonalInformation {
  @ApiProperty({
    example: 'b57b302e-74a1-47e3-8fbb-d56454f61bec',
    description: 'El ID del cliente',
    uniqueItems: true,
    readOnly: true,
    default: 'UUID auto generado',
    format: 'uuid',
    type: String,
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: 'Carrera 15 #12-22',
    description: 'Dirección del cliente',
    type: String,
  })
  @Column({ type: 'varchar', length: 200 })
  address: string;

  // External relations
  @ApiProperty({
    description: 'Registros de cosecha donde el empleado ha trabajado.',
    format: 'array',
    type: () => [HarvestDetails],
  })
  @OneToMany(
    () => HarvestDetails,
    (harvest_details) => harvest_details.employee,
    { cascade: true },
  )
  harvests_detail: HarvestDetails[];

  @ApiProperty({
    description: 'Registros de trabajo donde el empleado ha laborado.',
    format: 'array',
    type: () => [WorkDetails],
  })
  @OneToMany(() => WorkDetails, (workDetails) => workDetails.employee, {
    cascade: true,
  })
  works_detail: WorkDetails[];

  @ApiProperty({
    description: 'Registros de pago del empleado.',
    format: 'array',
    type: () => [Payment],
  })
  @OneToMany(() => Payment, (payment) => payment.employee, { cascade: true })
  payments: Payment[];
}
