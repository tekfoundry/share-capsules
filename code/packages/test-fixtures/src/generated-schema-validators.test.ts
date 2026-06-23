import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

describe('generated schema validators', () => {
    it.each([
        '../../capsule-core/src/generated/schema-validators.js',
        '../../ctx-client/src/generated/schema-validators.js',
    ])('is native ESM without runtime CommonJS loading: %s', async (relativePath) => {
        const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');

        expect(source).toContain("from 'ajv-formats/dist/formats.js'");
        expect(source).not.toMatch(/\brequire\s*\(/u);
    });
});
