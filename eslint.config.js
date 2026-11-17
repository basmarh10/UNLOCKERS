// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'server/data/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // Code exécuté dans le navigateur
    files: ['screen/**/*.js', 'phone/**/*.js', 'modules/**/screen.js', 'modules/**/phone.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  prettier,
];
