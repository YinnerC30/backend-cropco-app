import type { Config } from '@jest/types';
import commonConfig from './jest.config';

const e2eConfig: Config.InitialOptions = {
  ...commonConfig,
  testMatch: ['<rootDir>/src/**/*.e2e-spec.ts'], // Asume que tus E2E están en /test
  testTimeout: 30000, // Timeout mayor para pruebas E2E
  // globalSetup: './test/setup-e2e.ts', // Setup específico para E2E
  // globalTeardown: './test/teardown-e2e.ts', // Teardown específico para E2E
};

export default e2eConfig;
