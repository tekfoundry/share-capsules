import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'apps/browser-extension');
const output = resolve(source, 'build');
const target = buildTarget();
const config = extensionConfig(target);

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
await assertTargetBoundaries(target);

await Promise.all([
    writeFile(resolve(output, 'manifest.json'), `${JSON.stringify(manifest(config), null, 4)}\n`),
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
        define: runtimeDefines(config),
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

async function assertTargetBoundaries(buildTarget) {
    if (buildTarget === 'development') return;

    const files = ['studio.js', 'service-worker.js', 'viewer-frame.js'];
    const forbidden = [
        'http://localhost:3003',
        'http://localhost:3004',
        'dhconceamghcnndjodjhjikknblhkmej',
        'Share Capsules (Development)',
    ];

    for (const filename of files) {
        const contents = await readFile(resolve(output, filename), 'utf8');
        for (const marker of forbidden) {
            if (contents.includes(marker)) {
                throw new Error(`${filename} contains development marker ${marker}.`);
            }
        }
    }
}

function buildTarget() {
    const value = process.env.SHARECAPSULES_EXTENSION_BUILD ?? 'development';
    if (['development', 'production-reservation', 'production'].includes(value)) {
        return value;
    }

    throw new Error(
        'SHARECAPSULES_EXTENSION_BUILD must be development, production-reservation, or production.',
    );
}

function extensionConfig(buildTarget) {
    if (buildTarget === 'development') {
        return {
            target: buildTarget,
            name: 'Share Capsules (Development)',
            publicKey:
                'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlOwE0UgfIp5MUQNusv7zGk9LpXxwjGwHSxjsS+CsvNgf3ce8BBq9YJ/C5sNJnXQp3x3J6jShtovhn2QPffjdTprN8ypI5OfjhpXYXSjlod7EzvioatwoCCLg2pnrudLgBv12td9reLPhumtntyRkPzSPlPJ8wtC1Pl1a2HYu4nnSFePtH/Bbus6TvnYOJcfhzAcVgMpPFsPndDlL0XOJaMsgtMfwwzBcad+YhOa8vvqFrzJZdnnjfpyO72uQYg1uNPUemoQKTe66EDXhdHZphoJfLF1a4qUmr721ZscBJIpK0bJ6wf9VGbh9bqTWfDTuCgrGBrrXu7qgfKlWZb/VVwIDAQAB',
            extensionId: 'dhconceamghcnndjodjhjikknblhkmej',
            oauthClientId: '01977ac8-793e-72d4-a234-bd581e773e7e',
            controlPlane: 'http://localhost:3003',
            broker: 'http://localhost:3004',
            automaticHosts: [
                'http://localhost:3003/*',
                'http://localhost:3004/*',
                'http://localhost/*',
                'http://127.0.0.1/*',
            ],
            creatorMatches: ['http://localhost:3003/studio/capsules/create'],
            viewerResourceMatches: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
        };
    }

    const reservation = buildTarget === 'production-reservation';
    const extensionId = envValue(
        'SHARECAPSULES_EXTENSION_ID',
        reservation ? 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' : undefined,
    );
    assertExtensionId(extensionId, reservation);

    const publicKey =
        process.env.SHARECAPSULES_EXTENSION_PUBLIC_KEY ??
        cliArgValue('SHARECAPSULES_EXTENSION_PUBLIC_KEY') ??
        process.env[npmConfigName('SHARECAPSULES_EXTENSION_PUBLIC_KEY', '_')] ??
        process.env[npmConfigName('SHARECAPSULES_EXTENSION_PUBLIC_KEY', '-')];
    if (!reservation && publicKey === undefined) {
        throw new Error('SHARECAPSULES_EXTENSION_PUBLIC_KEY is required for production builds.');
    }
    if (publicKey !== undefined && extensionIdFromPublicKey(publicKey) !== extensionId) {
        throw new Error(
            'SHARECAPSULES_EXTENSION_PUBLIC_KEY does not match SHARECAPSULES_EXTENSION_ID.',
        );
    }

    const controlPlane = envValue('SHARECAPSULES_CONTROL_PLANE_URL', 'https://sharecapsules.com');
    const broker = envValue('SHARECAPSULES_BROKER_URL', 'https://broker.sharecapsules.com');
    assertHttpsOrigin(controlPlane, 'SHARECAPSULES_CONTROL_PLANE_URL');
    assertHttpsOrigin(broker, 'SHARECAPSULES_BROKER_URL');

    return {
        target: buildTarget,
        name: 'Share Capsules',
        publicKey,
        extensionId,
        oauthClientId: envValue(
            'SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID',
            reservation ? '00000000-0000-4000-8000-000000000000' : undefined,
        ),
        controlPlane,
        broker,
        automaticHosts: [`${controlPlane}/*`, `${broker}/*`],
        creatorMatches: [`${controlPlane}/studio/capsules/create`],
        viewerResourceMatches: ['https://*/*'],
    };
}

function manifest(config) {
    const base = {
        manifest_version: 3,
        name: config.name,
        version: '0.1.0',
        description:
            'Creates and views Share Capsules without exposing protected content to websites.',
        permissions: ['identity', 'scripting', 'storage'],
        host_permissions: config.automaticHosts,
        optional_host_permissions: ['https://*/*'],
        background: {
            service_worker: 'service-worker.js',
            type: 'module',
        },
        content_scripts: [
            {
                matches: config.creatorMatches,
                js: ['creator-handoff.js'],
                run_at: 'document_start',
            },
        ],
        web_accessible_resources: [
            {
                resources: ['viewer-frame.html', 'viewer-frame.css', 'viewer-frame.js'],
                matches: config.viewerResourceMatches,
            },
        ],
        content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'",
        },
    };

    return config.publicKey === undefined
        ? base
        : {
              ...base,
              key: config.publicKey,
          };
}

function runtimeDefines(config) {
    return {
        __SHARECAPSULES_CONTROL_PLANE__: JSON.stringify(config.controlPlane),
        __SHARECAPSULES_BROKER__: JSON.stringify(config.broker),
        __SHARECAPSULES_EXTENSION_ID__: JSON.stringify(config.extensionId),
        __SHARECAPSULES_OAUTH_CLIENT_ID__: JSON.stringify(config.oauthClientId),
    };
}

function envValue(name, fallback) {
    const value =
        process.env[name] ??
        cliArgValue(name) ??
        process.env[npmConfigName(name, '_')] ??
        process.env[npmConfigName(name, '-')] ??
        fallback;
    if (value === undefined || value.trim() === '') {
        throw new Error(`${name} is required.`);
    }

    return value.trim();
}

function npmConfigName(name, separator) {
    return `npm_config_${name.toLowerCase().replaceAll('_', separator)}`;
}

function cliArgValue(name) {
    const prefix = `--${name.toLowerCase().replaceAll('_', '-')}=`;
    const arg = process.argv.find((value) => value.startsWith(prefix));

    return arg === undefined ? undefined : arg.slice(prefix.length);
}

function assertExtensionId(value, reservation) {
    if (/^[a-p]{32}$/u.test(value)) return;
    if (reservation) {
        throw new Error('The production-reservation extension ID placeholder must be valid.');
    }

    throw new Error('SHARECAPSULES_EXTENSION_ID must be a 32-character Chrome extension ID.');
}

function assertHttpsOrigin(value, name) {
    const url = new URL(value);
    if (
        url.protocol !== 'https:' ||
        url.username !== '' ||
        url.password !== '' ||
        url.pathname !== '/' ||
        url.search !== '' ||
        url.hash !== ''
    ) {
        throw new Error(`${name} must be an HTTPS origin without path, query, or fragment.`);
    }
}

function extensionIdFromPublicKey(publicKey) {
    const digest = createHash('sha256').update(Buffer.from(publicKey, 'base64')).digest();

    return [...digest.subarray(0, 16)]
        .flatMap((byte) => [byte >> 4, byte & 15])
        .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
        .join('');
}
