import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { VIEWER_RELEASE } from './viewer-release.js';

const DEVELOPMENT_EXTENSION_ID = 'dhconceamghcnndjodjhjikknblhkmej';

describe('development Manifest V3 shell', () => {
    it('uses the fixed development identity and the reviewed least-privilege boundary', async () => {
        const manifest = await readManifest();

        expect(manifest.manifest_version).toBe(3);
        expect(manifest.version).toBe(VIEWER_RELEASE.version);
        expect(extensionId(manifest.key)).toBe(DEVELOPMENT_EXTENSION_ID);
        expect(manifest.permissions).toEqual(['identity', 'scripting', 'storage']);
        expect(manifest.host_permissions).toEqual([
            'http://localhost:3003/*',
            'http://localhost:3004/*',
            'http://localhost/*',
            'http://127.0.0.1/*',
        ]);
        expect(manifest.optional_host_permissions).toEqual(['https://*/*']);
        expect(manifest.background).toEqual({
            service_worker: 'service-worker.js',
            type: 'module',
        });
        expect(manifest.content_scripts).toEqual([
            {
                matches: ['http://localhost:3003/studio/capsules/create'],
                js: ['creator-handoff.js'],
                run_at: 'document_start',
            },
        ]);
        expect(manifest.web_accessible_resources).toEqual([
            {
                resources: ['viewer-frame.html', 'viewer-frame.css', 'viewer-frame.js'],
                matches: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
            },
        ]);
    });

    it('allows only packaged executable code and no wildcard automatic web access', async () => {
        const manifest = await readManifest();
        expect(JSON.stringify(manifest)).not.toMatch(/https?:\/\/[^"*]*\.js/u);
        expect(manifest.host_permissions).not.toContain('https://*/*');
        expect(manifest.content_scripts).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    matches: expect.arrayContaining(['https://*/*']),
                }),
            ]),
        );
        expect(manifest.content_security_policy).toEqual({
            extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'",
        });
    });
});

interface ExtensionManifest {
    readonly manifest_version: number;
    readonly version: string;
    readonly key: string;
    readonly permissions: readonly string[];
    readonly host_permissions: readonly string[];
    readonly optional_host_permissions: readonly string[];
    readonly background: unknown;
    readonly content_scripts: unknown;
    readonly web_accessible_resources: unknown;
    readonly content_security_policy: unknown;
}

async function readManifest(): Promise<ExtensionManifest> {
    const value: unknown = JSON.parse(
        await readFile(new URL('../manifest.json', import.meta.url), 'utf8'),
    );
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Manifest is malformed.');
    }
    return value as ExtensionManifest;
}

function extensionId(publicKey: string): string {
    const digest = createHash('sha256')
        .update(Buffer.from(publicKey, 'base64'))
        .digest()
        .subarray(0, 16);
    return [...digest]
        .flatMap((byte) => [byte >> 4, byte & 15])
        .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
        .join('');
}
