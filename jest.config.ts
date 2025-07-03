import type { Config } from '@jest/types';

const commonConfig: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: ['./jest-setup-file.ts'],
  // testMatch: ['<rootDir>/src/**/*.e2e-spec.ts', '<rootDir>/src/**/*.spec.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
};

export default commonConfig;
