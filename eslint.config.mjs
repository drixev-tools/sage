// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base recommended rules for JS
  eslint.configs.recommended,

  // TypeScript-specific recommended rules (type-aware)
  ...tseslint.configs.recommendedTypeChecked,

  // TypeScript parser + project config
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Project-specific rule overrides
  {
    rules: {
      // Allow explicit `any` in a few justified spots — warn instead of error
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused vars: error on real ones, but allow underscore-prefixed params
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Floating promises are risky in a CLI — always handle them
      '@typescript-eslint/no-floating-promises': 'error',

      // console.* is fine in a CLI tool
      'no-console': 'off',
    },
  },

  // Relax type-aware rules in test files — vi.fn() returns `any` by design
  {
    files: ['src/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      // Tests intentionally call fire-and-forget to assert side effects (e.g. process.exit)
      '@typescript-eslint/no-floating-promises': 'off',
      // Empty catch blocks are a valid "swallow error" pattern in test setup
      'no-empty': 'off',
    },
  },

  // Ignore built output
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
);
