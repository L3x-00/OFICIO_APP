// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // `eslint.config.mjs` se ignora a sí mismo. `src/generated/` lo emite
    // Prisma — código autogenerado, no lo lintea ni lo formatea nadie.
    //
    // `test/**` se excluye porque los specs no están en tsconfig.json
    // (tsc con `module:nodenext` exige imports `.js` que jest no
    // necesita). El tipado de los tests lo cubren jest + ts-jest al
    // correrlos; lintarlos acá solo agrega ruido y rompe el hook.
    ignores: ['eslint.config.mjs', 'src/generated/**', 'test/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Reglas de tipificación del backend — degradadas a `warn` para no
      // bloquear commits con deuda técnica conocida. Los warnings siguen
      // apareciendo en consola y en el CI; el merge se bloquea allá.
      // Si querés subirlas a `error` cuando se limpie la deuda, esta es
      // la única tabla a tocar.
      '@typescript-eslint/no-explicit-any':         'off',
      '@typescript-eslint/no-floating-promises':    'warn',
      '@typescript-eslint/no-unused-vars':          'warn',
      '@typescript-eslint/no-unsafe-argument':      'warn',
      '@typescript-eslint/no-unsafe-assignment':    'warn',
      '@typescript-eslint/no-unsafe-call':          'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return':        'warn',
      // `require-await` salta en métodos async vacíos de adapters /
      // factories de Nest (firmas async dictadas por el framework). Es
      // deuda estilística; no debe bloquear commits.
      '@typescript-eslint/require-await':           'warn',
      // Prettier sigue como error — formato es trivial de arreglar y la
      // auto-corrección del hook lo deja siempre verde.
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
