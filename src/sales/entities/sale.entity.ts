import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SaleDetails } from './sale-details.entity';

@Entity({ name: 'sales' })
export class Sale {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Identificador único de la venta',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    example: '2023-07-21',
    description: 'Fecha de la venta en formato ISO 8601',
  })
  @Column({
    type: 'date',
  })
  date: string;

  @ApiProperty({
    example: 5,
    description: 'Cantidad total de items vendidos',
  })
  @Column({
    type: 'int4',
  })
  amount: number;

  @ApiProperty({
    example: 100,
    description: 'Monto total de la venta',
  })
  @Column({
    type: 'int4',
  })
  value_pay: number;

  @ApiProperty({
    type: () => [SaleDetails],
    description: 'Detalles de los items incluidos en la venta',
  })
  @OneToMany(() => SaleDetails, (details) => details.sale, {
    cascade: true,
  })
  details: SaleDetails[];


  @CreateDateColumn()
    createdDate: Date;
  
    @UpdateDateColumn()
    updatedDate: Date;
  
    @DeleteDateColumn()
    deletedDate: Date;
}
