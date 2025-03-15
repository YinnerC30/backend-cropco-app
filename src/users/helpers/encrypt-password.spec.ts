import { hashPassword, comparePasswords } from './encrypt-password';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('encrypt-password helpers', () => {
  describe('hashPassword', () => {
    it('should hash the password successfully', async () => {
      const password = 'testPassword';
      const hashedPassword = 'hashedPassword';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(result).toBe(hashedPassword);
    });

    it('should throw an error if bcrypt.hash fails', async () => {
      const password = 'testPassword';
      const error = new Error('Hashing failed');
      (bcrypt.hash as jest.Mock).mockRejectedValue(error);

      await expect(hashPassword(password)).rejects.toThrow(error);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('comparePasswords', () => {
    it('should return true if passwords match', async () => {
      const plainPassword = 'testPassword';
      const hashedPassword = 'hashedPassword';
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await comparePasswords(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(true);
    });

    it('should return false if passwords do not match', async () => {
      const plainPassword = 'testPassword';
      const hashedPassword = 'hashedPassword';
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await comparePasswords(plainPassword, hashedPassword);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });

    it('should throw an error if bcrypt.compare fails', async () => {
      const plainPassword = 'testPassword';
      const hashedPassword = 'hashedPassword';
      const error = new Error('Comparison failed');
      (bcrypt.compare as jest.Mock).mockRejectedValue(error);

      await expect(
        comparePasswords(plainPassword, hashedPassword),
      ).rejects.toThrow(error);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
    });
  });
});
