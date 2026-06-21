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
        files: [
            'apps/**/*.ts',
            'packages/**/*.ts',
            'tests/Browser/**/*.ts',
            'playwright.config.ts',
        ],
    })),
    {
        files: [
            'apps/**/*.ts',
            'packages/**/*.ts',
            'tests/Browser/**/*.ts',
            'playwright.config.ts',
        ],
        languageOptions: { parser: tseslint.parser },
    },
    {
        files: ['playwright.config.ts'],
        languageOptions: {
            globals: {
                process: 'readonly',
            },
        },
    },
    {
        files: ['resources/js/**/*.js'],
        languageOptions: {
            globals: {
                console: 'readonly',
                document: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLFormElement: 'readonly',
                HTMLElement: 'readonly',
                HTMLInputElement: 'readonly',
                window: 'readonly',
            },
        },
    },
    {
        files: ['vite.config.js'],
        languageOptions: {
            globals: {
                process: 'readonly',
            },
        },
    },
);
