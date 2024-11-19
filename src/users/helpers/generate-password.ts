import * as generator from 'generate-password';
export const generatePassword = () => {
  const password = generator.generate({
    length: 12, // Longitud de la contraseña
    numbers: true, // Incluir números
    symbols: false, // Incluir símbolos
    uppercase: true, // Incluir mayúsculas
    lowercase: true, // Incluir minúsculas
    excludeSimilarCharacters: true, // Excluir caracteres similares (ej. 1 y l)
  });

  return password;
};
