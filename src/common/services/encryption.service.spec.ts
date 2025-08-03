import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSecurePassword', () => {
    it('should generate a secure password with correct length', () => {
      const password = service.generateSecurePassword();

      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(12);
    });

    it('should generate different passwords on each call', () => {
      const password1 = service.generateSecurePassword();
      const password2 = service.generateSecurePassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('encryptPassword and decryptPassword', () => {
    it('should encrypt and decrypt password correctly', () => {
      const originalPassword = 'testPassword123!';

      const encrypted = service.encryptPassword(originalPassword);
      const decrypted = service.decryptPassword(encrypted);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(originalPassword);
      expect(decrypted).toBe(originalPassword);
    });

    it('should generate different encrypted strings for the same password', () => {
      const password = 'testPassword123!';

      const encrypted1 = service.encryptPassword(password);
      const encrypted2 = service.encryptPassword(password);

      expect(encrypted1).not.toBe(encrypted2);

      // Pero ambos deben desencriptar al mismo valor
      expect(service.decryptPassword(encrypted1)).toBe(password);
      expect(service.decryptPassword(encrypted2)).toBe(password);
    });

    it('should handle special characters in password', () => {
      const specialPassword = 'P@ssw0rd!@#$%^&*()';

      const encrypted = service.encryptPassword(specialPassword);
      const decrypted = service.decryptPassword(encrypted);

      expect(decrypted).toBe(specialPassword);
    });

    it('should handle empty password', () => {
      const emptyPassword = '';

      const encrypted = service.encryptPassword(emptyPassword);
      const decrypted = service.decryptPassword(encrypted);

      expect(decrypted).toBe(emptyPassword);
    });

    it('should handle long password', () => {
      const longPassword = 'a'.repeat(1000);

      const encrypted = service.encryptPassword(longPassword);
      const decrypted = service.decryptPassword(encrypted);

      expect(decrypted).toBe(longPassword);
    });
  });
});
