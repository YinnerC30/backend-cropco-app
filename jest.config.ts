import type { Config } from '@jest/types';

const commonConfig: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@users/(.*)$': '<rootDir>/src/users/$1',
    '^@employees/(.*)$': '<rootDir>/src/employees/$1',
    '^@clients/(.*)$': '<rootDir>/src/clients/$1',
    '^@seed/(.*)$': '<rootDir>/src/seed/$1',
    '^@printer/(.*)$': '<rootDir>/src/printer/$1',
    '^@auth/(.*)$': '<rootDir>/src/auth/$1',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  setupFiles: ['<rootDir>/jest-setup-file.ts'],
  testMatch: ['<rootDir>/src/**/*.e2e-spec.ts', '<rootDir>/src/**/*.spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  roots: ['<rootDir>/src'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
};

export default commonConfig;
