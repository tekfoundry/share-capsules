import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'apps/browser-extension');
const output = resolve(source, 'build');

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

await bundle('src/creator-runtime.ts', 'studio.js', 'es');
await bundle('src/extension-service-worker.ts', 'service-worker.js', 'es');
await bundle('src/creator-handoff-content.ts', 'creator-handoff.js', 'iife');
await assertNoRuntimeCodeGeneration(['studio.js', 'service-worker.js', 'creator-handoff.js']);

await Promise.all([
    cp(resolve(source, 'manifest.json'), resolve(output, 'manifest.json')),
    cp(resolve(source, 'creator-studio.html'), resolve(output, 'creator-studio.html')),
    cp(resolve(source, 'creator-studio.css'), resolve(output, 'creator-studio.css')),
]);

async function bundle(entry, filename, format) {
    await build({
        configFile: false,
        root,
        publicDir: false,
        logLevel: 'warn',
        build: {
            emptyOutDir: false,
            minify: false,
            outDir: output,
            sourcemap: true,
            lib: {
                entry: resolve(source, entry),
                formats: [format],
                fileName: () => filename,
                name: 'ShareCapsulesExtension',
            },
        },
    });
}

async function assertNoRuntimeCodeGeneration(filenames) {
    const forbiddenCodeGeneration = /\b(?:eval|Function)\s*\(/u;

    for (const filename of filenames) {
        const javascript = await readFile(resolve(output, filename), 'utf8');
        if (forbiddenCodeGeneration.test(javascript)) {
            throw new Error(
                `${filename} uses runtime code generation, which Manifest V3 extension CSP forbids.`,
            );
        }
    }
}
