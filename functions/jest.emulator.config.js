/** @type {import('jest').Config} */
// Config separada para tests que requieren el emulador de Firestore real corriendo
// (no mocks). Correr con:
//   firebase emulators:exec --only firestore "npm run test:concurrency"
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.concurrency.test.ts', '**/*.emulator.test.ts'],
  testTimeout: 30000,
};
