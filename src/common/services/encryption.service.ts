import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as generator from 'generate-password';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger('EncryptionService');

  /**
   * Genera una contraseña segura para un tenant
   */
  generateSecurePassword(): string {
    this.logger.debug('Generating secure password');
    
    return generator.generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: true,
    });
  }

  /**
   * Encripta una contraseña usando AES-256-GCM
   */
  encryptPassword(password: string): string {
    this.logger.debug('Encrypting password');
    
    const algorithm = 'aes-256-gcm';
    const secretKey =
      process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-this';
    const key = crypto.scryptSync(secretKey, 'salt', 32);

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from('additional-auth-data'));

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Desencripta una contraseña
   */
  decryptPassword(encryptedPassword: string): string {
    this.logger.debug('Decrypting password');
    
    const algorithm = 'aes-256-gcm';
    const secretKey =
      process.env.TENANT_ENCRYPTION_KEY || 'default-key-change-this';
    const key = crypto.scryptSync(secretKey, 'salt', 32);

    const [ivHex, authTagHex, encrypted] = encryptedPassword.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from('additional-auth-data'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
} 