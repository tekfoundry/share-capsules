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
await bundle('src/viewer-discovery-content.ts', 'viewer-discovery.js', 'iife');
await bundle('src/viewer-frame.ts', 'viewer-frame.js', 'es');
await assertNoRuntimeCodeGeneration([
    'studio.js',
    'service-worker.js',
    'creator-handoff.js',
    'viewer-discovery.js',
    'viewer-frame.js',
]);

await Promise.all([
    cp(resolve(source, 'manifest.json'), resolve(output, 'manifest.json')),
    cp(resolve(source, 'creator-studio.html'), resolve(output, 'creator-studio.html')),
    cp(resolve(source, 'creator-studio.css'), resolve(output, 'creator-studio.css')),
    cp(resolve(source, 'viewer-frame.html'), resolve(output, 'viewer-frame.html')),
    cp(resolve(source, 'viewer-frame.css'), resolve(output, 'viewer-frame.css')),
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
