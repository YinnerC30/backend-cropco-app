export interface Seed {
  users: User[];
  crops: Crop[];
}

export interface User {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  cell_phone_number: string;
}
export interface Crop {
  name: string;
  description: string;
  units: string;
  location: string;
  date_of_creation: string;
  date_of_termination: string;
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
};
