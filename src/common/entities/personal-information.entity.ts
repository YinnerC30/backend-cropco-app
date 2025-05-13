import { Column } from 'typeorm';

export class PersonalInformation {
  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  first_name: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  last_name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 10, name: 'cell_phone_number' })
  cell_phone_number: string;
}
