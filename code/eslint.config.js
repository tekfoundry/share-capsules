import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
    {
        ignores: ['node_modules/**', 'public/build/**', '**/dist/**', '**/*.d.ts'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['apps/**/*.ts', 'packages/**/*.ts'],
    })),
    {
        files: ['apps/**/*.ts', 'packages/**/*.ts'],
        languageOptions: { parser: tseslint.parser },
    },
    {
        files: ['resources/js/**/*.js', 'vite.config.js'],
        languageOptions: {
            globals: {
                console: 'readonly',
                process: 'readonly',
            },
        },
    },
);
