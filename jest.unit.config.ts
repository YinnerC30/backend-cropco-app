import type { Config } from '@jest/types';
import commonConfig from './jest.config';

const unitConfig: Config.InitialOptions = {
  ...commonConfig,
  testMatch: ['<rootDir>/src/**/*.spec.ts'], // Solo archivos .spec.ts
  coverageDirectory: './coverage/unit', // Carpeta separada para cobertura
};

export default unitConfig;