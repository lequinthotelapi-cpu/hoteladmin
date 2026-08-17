/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // *.concurrency.test.ts y *.emulator.test.ts requieren el emulador de Firestore
  // real corriendo (ver jest.emulator.config.js) — se excluyen del `npm test`
  // rápido/offline.
  testPathIgnorePatterns: ['/node_modules/', '\\.concurrency\\.test\\.ts$', '\\.emulator\\.test\\.ts$'],
};
