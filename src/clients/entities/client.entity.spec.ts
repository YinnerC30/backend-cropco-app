import { Client } from './client.entity';
import { PersonalInformation } from 'src/common/entities/personal-information.entity';
import { SaleDetails } from 'src/sales/entities/sale-details.entity';

describe('Client Entity', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client();
  });

  it('should be defined', () => {
    expect(client).toBeDefined();
  });

  it('should extend PersonalInformation', () => {
    expect(client instanceof PersonalInformation).toBe(true);
  });

  it('should have an id property', () => {
    expect(client.id).toBeUndefined(); // El ID no está definido inicialmente
    client.id = '123e4567-e89b-12d3-a456-426614174000';
    expect(client.id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should have an address property', () => {
    expect(client.address).toBeUndefined(); // La dirección no está definida inicialmente
    client.address = 'Calle Falsa 123, Ciudad, País';
    expect(client.address).toBe('Calle Falsa 123, Ciudad, País');
  });

  it('should have a sales_detail relation', () => {
    expect(client.sales_detail).toBeUndefined(); // La relación no está definida inicialmente
    const mockSaleDetails = [new SaleDetails()];
    client.sales_detail = mockSaleDetails;
    expect(client.sales_detail).toEqual(mockSaleDetails);
  });

  it('should have timestamps', () => {
    expect(client.createdDate).toBeUndefined();
    expect(client.updatedDate).toBeUndefined();
    expect(client.deletedDate).toBeUndefined();

    const now = new Date();
    client.createdDate = now;
    client.updatedDate = now;
    client.deletedDate = now;

    expect(client.createdDate).toBe(now);
    expect(client.updatedDate).toBe(now);
    expect(client.deletedDate).toBe(now);
  });
});
