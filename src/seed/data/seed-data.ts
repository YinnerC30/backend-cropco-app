import { UnitOfMeasure } from 'src/supplies/entities/supply.entity';

export interface Seed {
  users: User[];
  crops: Crop[];
  employees: Employee[];
  clients: Client[];
  suppliers: Supplier[];
  supplies: Supply[];
  harvests: Harvest[];
  purchaseSupplies: PurchaseSupplies[];
  consumptionSupplies: ConsumptionSupplies[];
}

export interface User {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  cell_phone_number: string;
}
export interface Employee {
  first_name: string;
  last_name: string;
  email: string;
  cell_phone_number: string;
  address: string;
}
export interface Client {
  first_name: string;
  last_name: string;
  email: string;
  cell_phone_number: string;
  address: string;
}
export interface Supplier {
  first_name: string;
  last_name: string;
  email: string;
  cell_phone_number: string;
  address: string;
  company_name?: string;
}
export interface Crop {
  name: string;
  description: string;
  units: string;
  location: string;
  date_of_creation: string;
  date_of_termination: string;
}
export interface Supply {
  name: string;
  brand: string;
  unit_of_measure: UnitOfMeasure;
  observation: string;
}

export interface Harvest {
  date: string;
  unit_of_measure: string;
  total: number;
  value_pay: number;
  observation: string;
  details: HarvestDetail[];
}

export interface HarvestDetail {
  total: number;
  value_pay: number;
}

export interface PurchaseSupplies {
  date: string;
  total: number;
  details: PurchaseSuppliesDetails[];
}

export interface PurchaseSuppliesDetails {
  amount: number;
  total: number;
}
export interface ConsumptionSupplies {
  date: string;
  details: ConsumptionSuppliesDetails[];
}

export interface ConsumptionSuppliesDetails {
  crop?: string;
  supply?: string;
  amount: number;
}

export const initialData: Seed = {
  users: [
    {
      first_name: 'Juan',
      last_name: 'Perez',
      email: 'juanperez@example.com',
      password: 'abc123',
      cell_phone_number: '3001234567',
    },
    {
      first_name: 'Maria',
      last_name: 'Gomez',
      email: 'mariagomez@example.com',
      password: 'xyz789',
      cell_phone_number: '3004567890',
    },
    {
      first_name: 'Carlos',
      last_name: 'Lopez',
      email: 'carloslopez@example.com',
      password: '123qwe',
      cell_phone_number: '3007890123',
    },
    {
      first_name: 'Laura',
      last_name: 'Rodriguez',
      email: 'laurarodriguez@example.com',
      password: 'zxc789',
      cell_phone_number: '3001234567',
    },
    {
      first_name: 'Andres',
      last_name: 'Hernandez',
      email: 'andreshernandez@example.com',
      password: 'qwe123',
      cell_phone_number: '3004567890',
    },
    {
      first_name: 'Ana',
      last_name: 'Gonzalez',
      email: 'anagonzalez@example.com',
      password: '789abc',
      cell_phone_number: '3007890123',
    },
    {
      first_name: 'Pedro',
      last_name: 'Silva',
      email: 'pedrosilva@example.com',
      password: '123zxc',
      cell_phone_number: '3001234567',
    },
    {
      first_name: 'Sofia',
      last_name: 'Torres',
      email: 'sofiatorres@example.com',
      password: 'abc789',
      cell_phone_number: '3004567890',
    },
    {
      first_name: 'Javier',
      last_name: 'Rojas',
      email: 'javierrojas@example.com',
      password: '789qwe',
      cell_phone_number: '3007890123',
    },
    {
      first_name: 'Carmen',
      last_name: 'Ortega',
      email: 'carmenortega@example.com',
      password: 'qwe789',
      cell_phone_number: '3001234567',
    },
    {
      first_name: 'Luis',
      last_name: 'Santos',
      email: 'luissantos@example.com',
      password: '789zxc',
      cell_phone_number: '3004567890',
    },
    {
      first_name: 'Paula',
      last_name: 'Vargas',
      email: 'paulavargas@example.com',
      password: 'zxc123',
      cell_phone_number: '3007890123',
    },
    {
      first_name: 'Felipe',
      last_name: 'Cruz',
      email: 'felipecruz@example.com',
      password: '123abc',
      cell_phone_number: '3001234567',
    },
    {
      first_name: 'Valentina',
      last_name: 'Mendoza',
      email: 'valentinamendoza@example.com',
      password: 'abcxyz',
      cell_phone_number: '3004567890',
    },
    {
      first_name: 'Gabriel',
      last_name: 'Pacheco',
      email: 'gabrielpacheco@example.com',
      password: 'xyz123',
      cell_phone_number: '3007890123',
    },
  ],
  crops: [
    {
      name: 'Wheat',
      description: 'A cereal grain',
      units: '100',
      location: '42.3601° N, 71.0589° W',
      date_of_creation: '2021-03-01',
      date_of_termination: '2021-07-01',
    },
    {
      name: 'Corn',
      description: 'A large grain plant',
      units: '200',
      location: '34.0522° N, 118.2437° W',
      date_of_creation: '2021-04-01',
      date_of_termination: '2021-09-01',
    },
    {
      name: 'Rice',
      description: 'A grass species',
      units: '150',
      location: '35.6895° N, 139.6917° E',
      date_of_creation: '2021-05-01',
      date_of_termination: '2021-10-01',
    },
    {
      name: 'Soybean',
      description: 'A legume',
      units: '250',
      location: '41.8781° N, 87.6298° W',
      date_of_creation: '2021-06-01',
      date_of_termination: '2021-11-01',
    },
    {
      name: 'Potato',
      description: 'An underground tuber',
      units: '300',
      location: '51.5074° N, 0.1278° W',
      date_of_creation: '2021-07-01',
      date_of_termination: '2021-12-01',
    },
    {
      name: 'Barley',
      description: 'A cereal grain',
      units: '120',
      location: '55.7558° N, 37.6176° E',
      date_of_creation: '2021-08-01',
      date_of_termination: '2022-01-01',
    },
    {
      name: 'Cotton',
      description: 'A soft, fluffy fiber',
      units: '180',
      location: '29.7604° N, 95.3698° W',
      date_of_creation: '2021-09-01',
      date_of_termination: '2022-02-01',
    },
    {
      name: 'Sugarcane',
      description: 'A tall perennial grass',
      units: '220',
      location: '19.0760° N, 72.8777° E',
      date_of_creation: '2021-10-01',
      date_of_termination: '2022-03-01',
    },
    {
      name: 'Oats',
      description: 'A cereal grain',
      units: '80',
      location: '59.9139° N, 10.7522° E',
      date_of_creation: '2021-11-01',
      date_of_termination: '2022-04-01',
    },
    {
      name: 'Tomato',
      description: 'A red or yellowish fruit',
      units: '350',
      location: '40.7128° N, 74.0060° W',
      date_of_creation: '2021-12-01',
      date_of_termination: '2022-05-01',
    },
    {
      name: 'Cabbage',
      description: 'A leafy green or purple biennial plant',
      units: '400',
      location: '51.5074° N, 0.1278° W',
      date_of_creation: '2022-01-01',
      date_of_termination: '2022-06-01',
    },
    {
      name: 'Sorghum',
      description: 'A genus of flowering plants',
      units: '130',
      location: '39.9042° N, 116.4074° E',
      date_of_creation: '2022-02-01',
      date_of_termination: '2022-07-01',
    },
    {
      name: 'Peanut',
      description: 'A legume',
      units: '270',
      location: '37.7749° N, 122.4194° W',
      date_of_creation: '2022-03-01',
      date_of_termination: '2022-08-01',
    },
    {
      name: 'Carrot',
      description: 'A root vegetable',
      units: '320',
      location: '48.8566° N, 2.3522° E',
      date_of_creation: '2022-04-01',
      date_of_termination: '2022-09-01',
    },
    {
      name: 'Sesame',
      description: 'A flowering plant',
      units: '140',
      location: '35.6895° N, 139.6917° E',
      date_of_creation: '2022-05-01',
      date_of_termination: '2022-10-01',
    },
  ],
  employees: [
    {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      cell_phone_number: '1234567890',
      address: '123 Main St',
    },
    {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      cell_phone_number: '0987654321',
      address: '456 Elm St',
    },
    {
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'michael.johnson@example.com',
      cell_phone_number: '9876543210',
      address: '789 Oak St',
    },
    {
      first_name: 'Emily',
      last_name: 'Brown',
      email: 'emily.brown@example.com',
      cell_phone_number: '0123456789',
      address: '321 Maple Ave',
    },
    {
      first_name: 'Daniel',
      last_name: 'Taylor',
      email: 'daniel.taylor@example.com',
      cell_phone_number: '9876543210',
      address: '654 Pine Rd',
    },
    {
      first_name: 'Olivia',
      last_name: 'Miller',
      email: 'olivia.miller@example.com',
      cell_phone_number: '0123456789',
      address: '987 Cedar Ln',
    },
    {
      first_name: 'Matthew',
      last_name: 'Anderson',
      email: 'matthew.anderson@example.com',
      cell_phone_number: '1234567890',
      address: '159 Birch Blvd',
    },
    {
      first_name: 'Sophia',
      last_name: 'Thomas',
      email: 'sophia.thomas@example.com',
      cell_phone_number: '0987654321',
      address: '753 Willow Dr',
    },
    {
      first_name: 'David',
      last_name: 'Jackson',
      email: 'david.jackson@example.com',
      cell_phone_number: '9876543210',
      address: '852 Oak St',
    },
    {
      first_name: 'Ava',
      last_name: 'White',
      email: 'ava.white@example.com',
      cell_phone_number: '0123456789',
      address: '369 Elm St',
    },
    {
      first_name: 'Joseph',
      last_name: 'Harris',
      email: 'joseph.harris@example.com',
      cell_phone_number: '9876543210',
      address: '753 Maple Ave',
    },
    {
      first_name: 'Mia',
      last_name: 'Martin',
      email: 'mia.martin@example.com',
      cell_phone_number: '0123456789',
      address: '258 Pine Rd',
    },
    {
      first_name: 'Andrew',
      last_name: 'Thompson',
      email: 'andrew.thompson@example.com',
      cell_phone_number: '1234567890',
      address: '654 Cedar Ln',
    },
    {
      first_name: 'Isabella',
      last_name: 'Garcia',
      email: 'isabella.garcia@example.com',
      cell_phone_number: '0987654321',
      address: '951 Birch Blvd',
    },
    {
      first_name: 'William',
      last_name: 'Martinez',
      email: 'william.martinez@example.com',
      cell_phone_number: '9876543210',
      address: '357 Willow Dr',
    },
  ],
  clients: [
    {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      cell_phone_number: '1234567890',
      address: '123 Main St',
    },
    {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      cell_phone_number: '0987654321',
      address: '456 Elm St',
    },
    {
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'michael.johnson@example.com',
      cell_phone_number: '9876543210',
      address: '789 Oak St',
    },
    {
      first_name: 'Emily',
      last_name: 'Brown',
      email: 'emily.brown@example.com',
      cell_phone_number: '0123456789',
      address: '321 Maple Ave',
    },
    {
      first_name: 'Daniel',
      last_name: 'Taylor',
      email: 'daniel.taylor@example.com',
      cell_phone_number: '9876543210',
      address: '654 Pine Rd',
    },
    {
      first_name: 'Olivia',
      last_name: 'Miller',
      email: 'olivia.miller@example.com',
      cell_phone_number: '0123456789',
      address: '987 Cedar Ln',
    },
    {
      first_name: 'Matthew',
      last_name: 'Anderson',
      email: 'matthew.anderson@example.com',
      cell_phone_number: '1234567890',
      address: '159 Birch Blvd',
    },
    {
      first_name: 'Sophia',
      last_name: 'Thomas',
      email: 'sophia.thomas@example.com',
      cell_phone_number: '0987654321',
      address: '753 Willow Dr',
    },
    {
      first_name: 'David',
      last_name: 'Jackson',
      email: 'david.jackson@example.com',
      cell_phone_number: '9876543210',
      address: '852 Oak St',
    },
    {
      first_name: 'Ava',
      last_name: 'White',
      email: 'ava.white@example.com',
      cell_phone_number: '0123456789',
      address: '369 Elm St',
    },
    {
      first_name: 'Joseph',
      last_name: 'Harris',
      email: 'joseph.harris@example.com',
      cell_phone_number: '9876543210',
      address: '753 Maple Ave',
    },
    {
      first_name: 'Mia',
      last_name: 'Martin',
      email: 'mia.martin@example.com',
      cell_phone_number: '0123456789',
      address: '258 Pine Rd',
    },
    {
      first_name: 'Andrew',
      last_name: 'Thompson',
      email: 'andrew.thompson@example.com',
      cell_phone_number: '1234567890',
      address: '654 Cedar Ln',
    },
    {
      first_name: 'Isabella',
      last_name: 'Garcia',
      email: 'isabella.garcia@example.com',
      cell_phone_number: '0987654321',
      address: '951 Birch Blvd',
    },
    {
      first_name: 'William',
      last_name: 'Martinez',
      email: 'william.martinez@example.com',
      cell_phone_number: '9876543210',
      address: '357 Willow Dr',
    },
  ],
  suppliers: [
    {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      cell_phone_number: '1234567890',
      address: '123 Main St',
    },
    {
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      cell_phone_number: '0987654321',
      address: '456 Elm St',
    },
    {
      first_name: 'Michael',
      last_name: 'Johnson',
      email: 'michael.johnson@example.com',
      cell_phone_number: '9876543210',
      address: '789 Oak St',
    },
    {
      first_name: 'Emily',
      last_name: 'Brown',
      email: 'emily.brown@example.com',
      cell_phone_number: '0123456789',
      address: '321 Maple Ave',
    },
    {
      first_name: 'Daniel',
      last_name: 'Taylor',
      email: 'daniel.taylor@example.com',
      cell_phone_number: '9876543210',
      address: '654 Pine Rd',
    },
    {
      first_name: 'Olivia',
      last_name: 'Miller',
      email: 'olivia.miller@example.com',
      cell_phone_number: '0123456789',
      address: '987 Cedar Ln',
    },
    {
      first_name: 'Matthew',
      last_name: 'Anderson',
      email: 'matthew.anderson@example.com',
      cell_phone_number: '1234567890',
      address: '159 Birch Blvd',
    },
    {
      first_name: 'Sophia',
      last_name: 'Thomas',
      email: 'sophia.thomas@example.com',
      cell_phone_number: '0987654321',
      address: '753 Willow Dr',
    },
    {
      first_name: 'David',
      last_name: 'Jackson',
      email: 'david.jackson@example.com',
      cell_phone_number: '9876543210',
      address: '852 Oak St',
    },
    {
      first_name: 'Ava',
      last_name: 'White',
      email: 'ava.white@example.com',
      cell_phone_number: '0123456789',
      address: '369 Elm St',
    },
    {
      first_name: 'Joseph',
      last_name: 'Harris',
      email: 'joseph.harris@example.com',
      cell_phone_number: '9876543210',
      address: '753 Maple Ave',
    },
    {
      first_name: 'Mia',
      last_name: 'Martin',
      email: 'mia.martin@example.com',
      cell_phone_number: '0123456789',
      address: '258 Pine Rd',
    },
    {
      first_name: 'Andrew',
      last_name: 'Thompson',
      email: 'andrew.thompson@example.com',
      cell_phone_number: '1234567890',
      address: '654 Cedar Ln',
    },
    {
      first_name: 'Isabella',
      last_name: 'Garcia',
      email: 'isabella.garcia@example.com',
      cell_phone_number: '0987654321',
      address: '951 Birch Blvd',
    },
    {
      first_name: 'William',
      last_name: 'Martinez',
      email: 'william.martinez@example.com',
      cell_phone_number: '9876543210',
      address: '357 Willow Dr',
    },
  ],
  supplies: [
    {
      name: 'Fertilizer 1',
      brand: 'Brand A',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 1',
    },
    {
      name: 'Pesticide 1',
      brand: 'Brand B',
      unit_of_measure: 'MILILITROS',
      observation: 'Observation 2',
    },
    {
      name: 'Seeds 1',
      brand: 'Brand C',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 3',
    },
    {
      name: 'Fertilizer 2',
      brand: 'Brand A',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 4',
    },
    {
      name: 'Pesticide 2',
      brand: 'Brand B',
      unit_of_measure: 'MILILITROS',
      observation: 'Observation 5',
    },
    {
      name: 'Seeds 2',
      brand: 'Brand C',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 6',
    },
    {
      name: 'Fertilizer 3',
      brand: 'Brand A',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 7',
    },
    {
      name: 'Pesticide 3',
      brand: 'Brand B',
      unit_of_measure: 'MILILITROS',
      observation: 'Observation 8',
    },
    {
      name: 'Seeds 3',
      brand: 'Brand C',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 9',
    },
    {
      name: 'Fertilizer 4',
      brand: 'Brand A',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 10',
    },
    {
      name: 'Pesticide 4',
      brand: 'Brand B',
      unit_of_measure: 'MILILITROS',
      observation: 'Observation 11',
    },
    {
      name: 'Seeds 4',
      brand: 'Brand C',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 12',
    },
    {
      name: 'Fertilizer 5',
      brand: 'Brand A',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 13',
    },
    {
      name: 'Pesticide 5',
      brand: 'Brand B',
      unit_of_measure: 'MILILITROS',
      observation: 'Observation 14',
    },
    {
      name: 'Seeds 5',
      brand: 'Brand C',
      unit_of_measure: 'GRAMOS',
      observation: 'Observation 15',
    },
  ],
  harvests: [
    {
      date: '2024-05-10',
      unit_of_measure: 'KILOGRAMOS',
      total: 4000,
      value_pay: 100000,
      observation: 'Ninguna por el momento',
      details: [
        {
          total: 2000,
          value_pay: 50000,
        },
        {
          total: 2000,
          value_pay: 50000,
        },
      ],
    },
  ],
  purchaseSupplies: [
    {
      date: '2024-06-23',
      total: 500000,
      details: [
        {
          amount: 100,
          total: 200000,
        },
        {
          amount: 100,
          total: 200000,
        },
        {
          amount: 100,
          total: 100000,
        },
      ],
    },
  ],
  consumptionSupplies: [
    {
      date: '2024-05-06',
      details: [
        {
          amount: 20,
        },
        {
          amount: 20,
        },
        {
          amount: 20,
        },
      ],
    },
  ],
};
