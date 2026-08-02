import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { TextEncoder } from 'node:util';

const codeRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(codeRoot, '..');
const extensionBuild = resolve(codeRoot, 'apps/browser-extension/build');
const extensionSource = resolve(codeRoot, 'apps/browser-extension');
const releaseEvidencePath = resolve(
    repositoryRoot,
    '_docs/operations/extension-release-candidate-latest.json',
);

const productionIdentity = Object.freeze({
    extensionId: 'jkejpdcobbbeichpodpeoiilnalepdph',
    extensionPublicKey:
        'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnL9kcyXka6oRRsM9/M8hkqOSzogFe7xDoV0wOAUC5706YjuFCQQ7Yl379UCjwSdj0D1dXAx4QkJafUsrfOQx5xubCIWjo3C26axT0oLhO8Jue0rV2B8mamrg6fIv3+nSIHMy+ZsOvSKE2rZF/bFbQcbtdtnWDXv2XCLI4dwNxCswPNvtRruYqKz34WpOwVBt75wcnU7sAHrOCIHlODX1hIqIMNouaNWQtlQ756pkoRzp0Ol+wClDHQsFOWY6D3kjU1iB+JzDsFn68Ts0pNoSxh30Y0WtwV4/2hhHQEk1TfL4FZVuJsPIbaNhZ7WZZPCi+VwUQThKSteT78BIhZ8ttwIDAQAB',
    oauthClientId: '418997f0-d3bd-4f91-811b-3352a006220f',
    controlPlane: 'https://sharecapsules.com',
    broker: 'https://broker.sharecapsules.com',
});

const uploadEntries = Object.freeze([
    'viewer-frame.css',
    'creator-studio.html',
    'viewer-discovery.js',
    'creator-studio.css',
    'creator-handoff.js',
    'studio.js',
    'viewer-frame.html',
    'manifest.json',
    'service-worker.js',
    'viewer-frame.js',
]);

const CRC32_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let value = n;
    for (let k = 0; k < 8; k++) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    CRC32_TABLE[n] = value >>> 0;
}

const startedAt = new Date();
const gates = [];
const releaseVersion = await sourceReleaseVersion();
const zipPath = resolve(
    extensionSource,
    `share-capsules-extension-${releaseVersion}-production.zip`,
);

await runGate('npm audit', 'npm', ['audit', '--audit-level=moderate'], codeRoot);
await runGate('composer audit', 'composer', ['audit'], codeRoot);
await runGate('npm test:ts', 'npm', ['run', 'test:ts'], codeRoot);
await runGate('npm typecheck', 'npm', ['run', 'typecheck'], codeRoot);
await runGate('npm lint', 'npm', ['run', 'lint'], codeRoot);
await runGate('composer lint', 'composer', ['lint'], codeRoot);
await runGate('npm format:check', 'npm', ['run', 'format:check'], codeRoot);

await runGate('production extension build', 'node', ['scripts/build-extension.mjs'], codeRoot, {
    SHARECAPSULES_EXTENSION_BUILD: 'production',
    SHARECAPSULES_EXTENSION_ID: productionIdentity.extensionId,
    SHARECAPSULES_EXTENSION_PUBLIC_KEY: productionIdentity.extensionPublicKey,
    SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID: productionIdentity.oauthClientId,
});
await verifyProductionManifest();

await runGate(
    'production supply-chain release check',
    'node',
    ['scripts/release-supply-chain-check.mjs'],
    codeRoot,
    {
        SHARECAPSULES_EXTENSION_BUILD: 'production',
        SHARECAPSULES_EXTENSION_ID: productionIdentity.extensionId,
        SHARECAPSULES_EXTENSION_PUBLIC_KEY: productionIdentity.extensionPublicKey,
        SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID: productionIdentity.oauthClientId,
    },
);
await verifyProductionManifest();

const zip = await writeUploadZip();
const supplyChainEvidence = JSON.parse(
    await readFile(
        resolve(repositoryRoot, '_docs/operations/supply-chain-release-check-latest.json'),
        'utf8',
    ),
);
const releaseEvidence = {
    type: 'share-capsules-extension-release-candidate',
    version: 1,
    generated_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    status: 'ready-for-manual-web-store-upload',
    extension: {
        version: releaseVersion,
        id: productionIdentity.extensionId,
        name: 'Share Capsules',
    },
    artifact: {
        path: relative(repositoryRoot, zipPath),
        bytes: zip.bytes,
        sha256: zip.sha256,
        entries: zip.entries,
    },
    supply_chain: {
        path: '_docs/operations/supply-chain-release-check-latest.json',
        status: supplyChainEvidence.status,
        aggregate_sha256:
            supplyChainEvidence.checks?.reproducible_extension_build?.aggregate_sha256,
    },
    gates: gates.map((gate) => ({
        name: gate.name,
        status: gate.status,
        duration_ms: gate.durationMs,
    })),
    manual_steps: [
        'Upload the ZIP to the existing Chrome Web Store item.',
        'Confirm version, extension ID, permissions, and no remote-code warnings in the dashboard.',
        'Submit for review as a no-behavior-change maintenance/refactor release.',
        'After publication, smoke test the store-installed extension against https://sharecapsules.com/capsule-test.',
    ],
};

await writeFile(releaseEvidencePath, `${JSON.stringify(releaseEvidence, null, 2)}\n`);

console.log('Production extension release candidate is ready.');
console.log(`ZIP: ${relative(repositoryRoot, zipPath)}`);
console.log(`ZIP sha256: ${zip.sha256}`);
console.log(`Supply-chain aggregate sha256: ${releaseEvidence.supply_chain.aggregate_sha256}`);
console.log(`Evidence: ${relative(repositoryRoot, releaseEvidencePath)}`);

async function sourceReleaseVersion() {
    const text = await readFile(resolve(extensionSource, 'src/viewer-release.ts'), 'utf8');
    const match = /version:\s*'(?<version>\d+\.\d+\.\d+)'/u.exec(text);
    if (match?.groups?.version === undefined) {
        throw new Error('Could not read extension release version from viewer-release.ts.');
    }

    return match.groups.version;
}

async function runGate(name, command, args, cwd, env = {}) {
    const started = Date.now();
    console.log(`\n== ${name} ==`);
    await run(command, args, cwd, env);
    gates.push({ name, status: 'passed', durationMs: Date.now() - started });
}

async function verifyProductionManifest() {
    const manifest = JSON.parse(await readFile(resolve(extensionBuild, 'manifest.json'), 'utf8'));
    const expected = {
        manifest_version: 3,
        name: 'Share Capsules',
        version: releaseVersion,
        permissions: ['identity', 'scripting', 'storage'],
        host_permissions: [
            `${productionIdentity.controlPlane}/*`,
            `${productionIdentity.broker}/*`,
        ],
        optional_host_permissions: ['https://*/*'],
        content_scripts: [
            {
                matches: [`${productionIdentity.controlPlane}/studio/capsules/create`],
                js: ['creator-handoff.js'],
                run_at: 'document_start',
            },
        ],
        web_accessible_resources: [
            {
                resources: ['viewer-frame.html', 'viewer-frame.css', 'viewer-frame.js'],
                matches: ['https://*/*'],
            },
        ],
        content_security_policy: {
            extension_pages: "script-src 'self'; object-src 'none'; base-uri 'none'",
        },
        key: productionIdentity.extensionPublicKey,
    };

    for (const [key, value] of Object.entries(expected)) {
        if (JSON.stringify(manifest[key]) !== JSON.stringify(value)) {
            throw new Error(`Production manifest ${key} did not match the expected value.`);
        }
    }
    if (extensionIdFromPublicKey(manifest.key) !== productionIdentity.extensionId) {
        throw new Error('Production manifest key does not derive the fixed extension ID.');
    }
}

async function writeUploadZip() {
    const entries = [];
    for (const name of uploadEntries) {
        const bytes = new Uint8Array(await readFile(resolve(extensionBuild, name)));
        entries.push({ name, bytes });
    }
    const zipBytes = storedZip(entries);
    await writeFile(zipPath, zipBytes);

    return {
        bytes: zipBytes.byteLength,
        sha256: sha256Hex(zipBytes),
        entries: entries.map((entry) => ({
            name: entry.name,
            bytes: entry.bytes.byteLength,
            sha256: sha256Hex(entry.bytes),
        })),
    };
}

function storedZip(entries) {
    const encoder = new TextEncoder();
    const encoded = entries.map((entry) => ({
        ...entry,
        nameBytes: encoder.encode(entry.name),
        crc: crc32(entry.bytes),
    }));
    let localSize = 0;
    for (const entry of encoded) {
        localSize += 30 + entry.nameBytes.byteLength + entry.bytes.byteLength;
    }
    const centralSize = encoded.reduce((size, entry) => size + 46 + entry.nameBytes.byteLength, 0);
    const output = new Uint8Array(localSize + centralSize + 22);
    const offsets = [];
    let cursor = 0;
    for (const entry of encoded) {
        offsets.push(cursor);
        writeU32(output, cursor, 0x04034b50);
        writeU16(output, cursor + 4, 20);
        writeU16(output, cursor + 6, 0);
        writeU16(output, cursor + 8, 0);
        writeU16(output, cursor + 10, 0);
        writeU16(output, cursor + 12, 0x0021);
        writeU32(output, cursor + 14, entry.crc);
        writeU32(output, cursor + 18, entry.bytes.byteLength);
        writeU32(output, cursor + 22, entry.bytes.byteLength);
        writeU16(output, cursor + 26, entry.nameBytes.byteLength);
        writeU16(output, cursor + 28, 0);
        output.set(entry.nameBytes, cursor + 30);
        output.set(entry.bytes, cursor + 30 + entry.nameBytes.byteLength);
        cursor += 30 + entry.nameBytes.byteLength + entry.bytes.byteLength;
    }
    const centralOffset = cursor;
    for (const [index, entry] of encoded.entries()) {
        writeU32(output, cursor, 0x02014b50);
        writeU16(output, cursor + 4, 20);
        writeU16(output, cursor + 6, 20);
        writeU16(output, cursor + 8, 0);
        writeU16(output, cursor + 10, 0);
        writeU16(output, cursor + 12, 0);
        writeU16(output, cursor + 14, 0x0021);
        writeU32(output, cursor + 16, entry.crc);
        writeU32(output, cursor + 20, entry.bytes.byteLength);
        writeU32(output, cursor + 24, entry.bytes.byteLength);
        writeU16(output, cursor + 28, entry.nameBytes.byteLength);
        writeU16(output, cursor + 30, 0);
        writeU16(output, cursor + 32, 0);
        writeU16(output, cursor + 34, 0);
        writeU16(output, cursor + 36, 0);
        writeU32(output, cursor + 38, 0);
        writeU32(output, cursor + 42, offsets[index] ?? 0);
        output.set(entry.nameBytes, cursor + 46);
        cursor += 46 + entry.nameBytes.byteLength;
    }
    writeU32(output, cursor, 0x06054b50);
    writeU16(output, cursor + 4, 0);
    writeU16(output, cursor + 6, 0);
    writeU16(output, cursor + 8, encoded.length);
    writeU16(output, cursor + 10, encoded.length);
    writeU32(output, cursor + 12, centralSize);
    writeU32(output, cursor + 16, centralOffset);
    writeU16(output, cursor + 20, 0);

    return output;
}

function extensionIdFromPublicKey(publicKey) {
    const digest = createHash('sha256').update(Buffer.from(publicKey, 'base64')).digest();

    return [...digest.subarray(0, 16)]
        .flatMap((byte) => [byte >> 4, byte & 15])
        .map((nibble) => String.fromCharCode('a'.charCodeAt(0) + nibble))
        .join('');
}

function sha256Hex(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function writeU16(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
}

function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
    }

    return (crc ^ 0xffffffff) >>> 0;
}

async function run(command, args, cwd, env) {
    await new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, {
            cwd,
            env: { ...process.env, ...env },
            stdio: 'inherit',
        });
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolvePromise();
            } else {
                reject(new Error(`${command} ${args.join(' ')} exited with ${code}.`));
            }
        });
    });
}
