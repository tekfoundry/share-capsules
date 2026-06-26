import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

const codeRoot = resolve(import.meta.dirname, '..');
const repositoryRoot = resolve(codeRoot, '..');
const extensionBuild = resolve(codeRoot, 'apps/browser-extension/build');
const outputPath = resolve(
    repositoryRoot,
    process.env.SUPPLY_CHAIN_CHECK_OUTPUT ??
        '_docs/operations/supply-chain-release-check-latest.json',
);

const startedAt = new Date();
const findings = [];

const firstBuild = await buildAndHashExtension();
const secondBuild = await buildAndHashExtension();

if (JSON.stringify(firstBuild.files) !== JSON.stringify(secondBuild.files)) {
    findings.push({
        check: 'reproducible_extension_build',
        severity: 'error',
        message: 'Two extension builds produced different file hashes.',
    });
}

findings.push(...(await scanBuiltExtension()));
findings.push(...(await scanTrackedSourceForSecrets()));

const artifact = {
    type: 'share-capsules-supply-chain-release-check',
    version: 1,
    generated_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    status: findings.some((finding) => finding.severity === 'error') ? 'failed' : 'passed',
    checks: {
        reproducible_extension_build: {
            status:
                JSON.stringify(firstBuild.files) === JSON.stringify(secondBuild.files)
                    ? 'passed'
                    : 'failed',
            file_count: firstBuild.files.length,
            aggregate_sha256: firstBuild.aggregateSha256,
            files: firstBuild.files,
        },
        built_extension_remote_code_scan: {
            status: findings.some((finding) => finding.check === 'built_extension_remote_code')
                ? 'failed'
                : 'passed',
        },
        tracked_source_secret_scan: {
            status: findings.some((finding) => finding.check === 'tracked_source_secret_scan')
                ? 'failed'
                : 'passed',
        },
    },
    findings,
};

await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

if (artifact.status !== 'passed') {
    console.error(
        `Supply-chain release check failed; see ${relative(repositoryRoot, outputPath)}.`,
    );
    process.exitCode = 1;
} else {
    console.log(
        `Supply-chain release check passed; wrote ${relative(repositoryRoot, outputPath)}.`,
    );
    console.log(`Extension aggregate sha256: ${firstBuild.aggregateSha256}`);
}

async function buildAndHashExtension() {
    await run(process.execPath, ['scripts/build-extension.mjs'], codeRoot);
    const files = [];
    for (const file of await listFiles(extensionBuild)) {
        const bytes = await readFile(file);
        files.push({
            path: relative(extensionBuild, file),
            bytes: bytes.byteLength,
            sha256: createHash('sha256').update(bytes).digest('hex'),
        });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));

    const aggregate = createHash('sha256');
    for (const file of files) {
        aggregate.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`);
    }

    return {
        aggregateSha256: aggregate.digest('hex'),
        files,
    };
}

async function scanBuiltExtension() {
    const results = [];
    const remoteExecutablePatterns = [
        /<script\b[^>]*\bsrc=["']https?:\/\//iu,
        /\bimportScripts\s*\(\s*["']https?:\/\//u,
        /\bimport\s*\(\s*["']https?:\/\//u,
        /\bnew\s+Worker\s*\(\s*["']https?:\/\//u,
        /https?:\/\/[^\s"'`<>]+\.m?js\b/iu,
    ];

    for (const file of await listFiles(extensionBuild)) {
        if (!['.js', '.html', '.json'].some((suffix) => file.endsWith(suffix))) {
            continue;
        }
        const text = await readFile(file, 'utf8');
        for (const pattern of remoteExecutablePatterns) {
            if (pattern.test(text)) {
                results.push({
                    check: 'built_extension_remote_code',
                    severity: 'error',
                    path: relative(repositoryRoot, file),
                    message: 'Built extension contains a remote executable-code reference.',
                });
            }
        }
    }

    return results;
}

async function scanTrackedSourceForSecrets() {
    const files = (await gitTrackedFiles()).filter((file) => shouldScanTrackedFile(file));
    const patterns = [
        { name: 'private_key_block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
        { name: 'aws_access_key_id', pattern: /\bAKIA[0-9A-Z]{16}\b/u },
        { name: 'github_token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,255}\b/u },
        { name: 'slack_token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u },
        { name: 'stripe_live_secret', pattern: /\bsk_live_[A-Za-z0-9]{24,}\b/u },
        { name: 'google_api_key', pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u },
    ];
    const results = [];

    for (const relativePath of files) {
        const absolutePath = resolve(repositoryRoot, relativePath);
        const text = await readFile(absolutePath, 'utf8');
        for (const { name, pattern } of patterns) {
            if (pattern.test(text)) {
                results.push({
                    check: 'tracked_source_secret_scan',
                    severity: 'error',
                    path: relativePath,
                    pattern: name,
                    message: 'Tracked source matched a high-confidence secret pattern.',
                });
            }
        }
    }

    return results;
}

async function gitTrackedFiles() {
    const output = await capture('git', ['ls-files', '-z'], repositoryRoot);
    return output.split('\0').filter((file) => file !== '');
}

function shouldScanTrackedFile(file) {
    const ignoredNames = new Set([
        'package-lock.json',
        'composer.lock',
        'tsconfig.browser.tsbuildinfo',
    ]);
    if (ignoredNames.has(basename(file))) return false;
    if (file.includes('/node_modules/') || file.includes('/vendor/')) return false;
    if (/\.(png|jpe?g|webp|gif|ico|zip|gz|pdf|woff2?)$/iu.test(file)) return false;

    return true;
}

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const child = resolve(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(child)));
        } else if (entry.isFile()) {
            files.push(child);
        }
    }

    return files;
}

async function run(command, args, cwd) {
    await new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, { cwd, stdio: 'inherit' });
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

async function capture(command, args, cwd) {
    return await new Promise((resolvePromise, reject) => {
        const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout = [];
        const stderr = [];
        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolvePromise(Buffer.concat(stdout).toString('utf8'));
            } else {
                reject(new Error(Buffer.concat(stderr).toString('utf8')));
            }
        });
    });
}
