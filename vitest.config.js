import { defineConfig } from 'vitest/config';

// Un seul lancement de Vitest pour tout le monorepo (npm test à la racine).
export default defineConfig({
  test: {
    include: ['shared/**/*.test.js', 'server/tests/**/*.test.js', 'modules/**/*.test.js'],
    passWithNoTests: true,
  },
});
