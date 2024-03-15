import * as bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  const saltOrRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltOrRounds);
    return hash;
  } catch (error) {
    console.error('Error to encrypt password', error);
    throw error;
  }
};

export const comparePasswords = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    const result = await bcrypt.compare(plainPassword, hashedPassword);
    return result;
  } catch (error) {
    console.error('Error to compare password to hash:', error);
    throw error;
  }
};
