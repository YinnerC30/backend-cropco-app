import { UnitOfMeasure } from 'src/supplies/entities';
import { v4 as uuidv4 } from 'uuid';

const colombianPhoneNumbers: string[] = [
  '3157894562',
  '3209876543',
  '3114567890',
  '3168907654',
  '3187654321',
  '3143219876',
  '3195678901',
  '3102345678',
  '3173456789',
  '3124567890',
];

const fakeFirstNames = [
  'Sofía',
  'Mateo',
  'Isabella',
  'Gabriel',
  'Valentina',
  'Alejandro',
  'Camila',
  'Sebastián',
  'Mariana',
  'Nicolás',
  'Lucía',
  'Daniel',
  'Emilia',
  'Andrés',
  'Martina',
  'Santiago',
  'Renata',
  'Joaquín',
  'Antonella',
  'Benjamín',
];

const fakeLastNames = [
  'Rodríguez',
  'Gómez',
  'Martínez',
  'López',
  'González',
  'Pérez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Díaz',
  'Vargas',
  'Castro',
  'Jiménez',
  'Ruiz',
  'Hernández',
  'Moreno',
  'Rojas',
  'Suárez',
  'Silva',
  'Navarro',
];

const fakeAddresses: string[] = [
  'Carrera 45 # 123-67 Edificio Sol',
  'Avenida Principal # 89-32 Torre B',
  'Calle 78 # 23-45 Apartamento 501',
  'Transversal 56 # 90-12 Casa 15A',
  'Diagonal 34 # 67-89 Bloque Norte',
  'Carrera 12 # 45-67 Torre Central',
  'Avenida Sur # 234-56 Piso 8 Of 4',
  'Calle 167 # 45-89 Conjunto Luna',
  'Carrera 78 # 90-23 Edificio Mar',
  'Avenida Este # 123-45 Casa Verde',
];

// const fakeSuppliesNames: string[] = [
//   'Fertilizante NPK',
//   'Insecticida Orgánico',
//   'Abono Compuesto',
//   'Herbicida Natural',
//   'Plaguicida Biológico',
//   'Fungicida Ecológico',
//   'Nutrientes Foliares',
//   'Sustrato Premium',
//   'Hormona de Crecimiento',
//   'Calcio Líquido',
//   'Boro Soluble',
//   'Zinc Quelado',
//   'Magnesio Foliar',
//   'Potasio Soluble',
//   'Fósforo Líquido',
// ];

const fakeSupplyBrands: string[] = [
  'Bayer',
  'Syngenta',
  'BASF',
  'Corteva',
  'FMC',
  'Yara',
  'Nutrien',
  'Mosaic',
  'UPL',
  'Adama',
  'Monsanto',
  'DuPont',
  'Dow AgroSciences',
  'Valent',
  'Nufarm',
];

export class InformationGenerator {
  static generateRandomIndex(lengthArray: number): number {
    const randomIndex = Math.floor(Math.random() * lengthArray);
    return randomIndex;
  }

  static generateRandomId(): string {
    const randomId = uuidv4();
    return randomId;
  }

  static generateFirstName = (): string => {
    const randomIndex = this.generateRandomIndex(fakeFirstNames.length);
    return fakeFirstNames[randomIndex];
  };

  static generateLastName = (): string => {
    const randomIndex = this.generateRandomIndex(fakeLastNames.length);
    return fakeLastNames[randomIndex];
  };

  static generateCellPhoneNumber = (): string => {
    const randomIndex = this.generateRandomIndex(colombianPhoneNumbers.length);
    return colombianPhoneNumbers[randomIndex];
  };

  static generateEmail = () => {
    const randomId = uuidv4();
    return `email_${randomId}@mail.com`;
  };

  static generateAddress = (): string => {
    const randomIndex = this.generateRandomIndex(fakeAddresses.length);
    return fakeAddresses[randomIndex];
  };

  static generateDescription = (): string => {
    return 'This is a simple description of the record for testing.';
  };
  static generateObservation = (): string => {
    return 'This is a simple description of the record for testing.';
  };

  static generateRandomDate = () => {
    return new Date().toISOString();
  };

  static generateSupplyBrand = (): string => {
    const randomIndex = this.generateRandomIndex(fakeSupplyBrands.length);
    return fakeSupplyBrands[randomIndex];
  };
  static generateUnitOfMeasure = (): UnitOfMeasure => {
    const units = ['GRAMOS', 'MILILITROS'];
    const randomIndex = this.generateRandomIndex(units.length);
    return units[randomIndex] as UnitOfMeasure;
  };
}
