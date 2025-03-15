import { generatePassword } from './generate-password';
import * as generator from 'generate-password';

jest.mock('generate-password');

describe('generatePassword', () => {
  it('should call the password generator with the correct options', () => {
    const mockGenerate = jest
      .spyOn(generator, 'generate')
      .mockReturnValue('mockPassword');

    const password = generatePassword();

    expect(mockGenerate).toHaveBeenCalledWith({
      length: 12,
      numbers: true,
      symbols: false,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: true,
    });
    expect(password).toBe('mockPassword');
  });

  it('should return a string of the correct length', () => {
    jest.spyOn(generator, 'generate').mockReturnValue('mockPassword');

    const password = generatePassword();

    expect(password).toHaveLength(12);
  });

  it('should generate a password with numbers', () => {
    jest.spyOn(generator, 'generate').mockReturnValue('mockPassword123');

    const password = generatePassword();

    expect(/\d/.test(password)).toBe(true);
  });

  it('should generate a password without symbols', () => {
    jest.spyOn(generator, 'generate').mockReturnValue('mockPassword123');

    const password = generatePassword();

    expect(/[^a-zA-Z0-9]/.test(password)).toBe(false);
  });

  it('should generate a password with uppercase letters', () => {
    jest.spyOn(generator, 'generate').mockReturnValue('MockPassword123');

    const password = generatePassword();

    expect(/[A-Z]/.test(password)).toBe(true);
  });

  it('should generate a password with lowercase letters', () => {
    jest.spyOn(generator, 'generate').mockReturnValue('mockPassword123');

    const password = generatePassword();

    expect(/[a-z]/.test(password)).toBe(true);
  });
});
