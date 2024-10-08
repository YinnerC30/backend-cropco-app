import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PersonalInformation } from '../../common/entities/personal-information.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'users' })
export class User extends PersonalInformation {
  @ApiProperty({ readOnly: true })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    readOnly: true,
  })
  @Column({ type: 'varchar', length: 100, select: false })
  password: string;

  @ApiProperty({
    description: 'Roles del usuario',
    example: ['user'],
  })
  @Column('text', {
    array: true,
    default: ['user'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Estado de activación del usuario',
    example: false,
  })
  @Column('bool', { default: false })
  is_active: boolean;

  @BeforeInsert()
  checkFieldsBeforeInsert() {
    this.email = this.email.toLowerCase().trim();
  }

  @BeforeUpdate()
  checkFieldsBeforeUpdate() {
    this.checkFieldsBeforeInsert();
  }
}
