import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      'lib/**',
      'app/lib/**',
      'app/dist/**',
      'shared/lib/**',
      'coverage/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-confusing-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-invalid-void-type': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/typedef': 'error',
      '@typescript-eslint/unified-signatures': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['app/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'electron',
              message:
                'Import electron only in app/src/adapters/ (value imports) or app/src/preload/ (preload context). Else use adapters or import type from app/src/adapters/electronTypes.ts.',
            },
          ],
          patterns: [
            {
              group: [
                '../../src/**',
                '../../../src/**',
                '../../../../src/**',
              ],
              message:
                'Runtime code must not import build-time modules from src/. Use app/src/runtimeContract.ts or shared/src instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'app/src/adapters/**/*.ts',
      'app/src/preload.ts',
      'app/src/loginPreload.ts',
      'app/src/preload/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../../src/**',
                '../../../src/**',
                '../../../../src/**',
              ],
              message:
                'Runtime code must not import build-time modules from src/. Use app/src/runtimeContract.ts or shared/src instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '../app/src/**',
                '../../app/src/**',
                '../../../app/src/**',
                '../../../../app/src/**',
              ],
              message:
                'Build-time code must not import runtime modules from app/src/. Copy the app template at build time instead.',
            },
          ],
        },
      ],
    },
  },
);
