import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const outputPath =
    process.env.IMAGE_ENVELOPE_BENCHMARK_OUTPUT ??
    path.join(repoRoot, '_docs', 'operations', 'static-image-envelope-benchmark-latest.json');

const thresholds = Object.freeze({
    maxTotalMsPerCase: Number(process.env.IMAGE_ENVELOPE_MAX_TOTAL_MS ?? 30_000),
    maxDecodedPixels: 40_000_000,
    maxDimension: 16_384,
    nominalMaxDecodedRgbaBytes: 160_000_000,
});

const cases = Object.freeze([
    {
        name: 'png-control',
        mediaType: 'image/png',
        width: 1024,
        height: 1024,
        quality: undefined,
    },
    {
        name: 'jpeg-control',
        mediaType: 'image/jpeg',
        width: 1024,
        height: 1024,
        quality: 0.9,
    },
    {
        name: 'webp-control',
        mediaType: 'image/webp',
        width: 1024,
        height: 1024,
        quality: 0.9,
    },
    {
        name: 'max-width-png',
        mediaType: 'image/png',
        width: thresholds.maxDimension,
        height: 1,
        quality: undefined,
    },
    {
        name: 'max-height-png',
        mediaType: 'image/png',
        width: 1,
        height: thresholds.maxDimension,
        quality: undefined,
    },
    {
        name: 'max-pixels-png',
        mediaType: 'image/png',
        width: 10_000,
        height: 4_000,
        quality: undefined,
        fillMode: 'solid',
    },
    {
        name: 'max-pixels-jpeg',
        mediaType: 'image/jpeg',
        width: 10_000,
        height: 4_000,
        quality: 0.85,
    },
    {
        name: 'max-pixels-webp',
        mediaType: 'image/webp',
        width: 10_000,
        height: 4_000,
        quality: 0.85,
    },
]);

const executablePath = process.env.IMAGE_ENVELOPE_CHROMIUM_EXECUTABLE_PATH;
const browser = await chromium.launch({
    executablePath:
        executablePath === undefined || executablePath === '' ? undefined : executablePath,
});
const page = await browser.newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable').catch(() => undefined);

try {
    const browserVersion = await browser.version();
    const userAgent = await page.evaluate(() => navigator.userAgent);
    const benchmarkStartedAt = new Date().toISOString();
    const results = [];

    for (const benchmarkCase of cases) {
        const before = await browserMetrics(cdp);
        const result = await page.evaluate(runImageEnvelopeCase, {
            ...benchmarkCase,
            thresholdTotalMs: thresholds.maxTotalMsPerCase,
        });
        const after = await browserMetrics(cdp);
        results.push({
            ...result,
            browserMetrics: {
                before,
                after,
                delta: metricDelta(before, after),
            },
        });
    }

    const artifact = {
        type: 'share-capsules-static-image-envelope-benchmark',
        version: 1,
        generatedAt: new Date().toISOString(),
        benchmarkStartedAt,
        environment: {
            browserName: 'chromium',
            browserVersion,
            executablePath: executablePath ?? null,
            userAgent,
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            cpuModel: os.cpus()[0]?.model ?? 'unknown',
            cpuCount: os.cpus().length,
            totalMemoryBytes: os.totalmem(),
        },
        v1Envelope: {
            maxEncodedBytes: 25 * 1024 * 1024,
            maxDimension: thresholds.maxDimension,
            maxPixels: thresholds.maxDecodedPixels,
            nominalMaxDecodedRgbaBytes: thresholds.nominalMaxDecodedRgbaBytes,
        },
        thresholds,
        results,
        summary: summarize(results),
    };

    if (artifact.summary.failed > 0) {
        throw new Error(`Image envelope benchmark failed ${artifact.summary.failed} case(s).`);
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`Static image envelope benchmark passed: ${outputPath}`);
} finally {
    await browser.close();
}

function summarize(results) {
    const failed = results.filter((result) => result.status !== 'passed').length;
    const totalMs = results.reduce((sum, result) => sum + result.timings.totalMs, 0);

    return {
        totalCases: results.length,
        passed: results.length - failed,
        failed,
        totalMs: round(totalMs),
        slowestCase: results
            .toSorted((left, right) => right.timings.totalMs - left.timings.totalMs)
            .at(0)?.name,
    };
}

async function browserMetrics(cdp) {
    try {
        const { metrics } = await cdp.send('Performance.getMetrics');
        return Object.fromEntries(
            metrics
                .filter(({ name }) =>
                    ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'LayoutCount'].includes(name),
                )
                .map(({ name, value }) => [name, value]),
        );
    } catch {
        return {};
    }
}

function metricDelta(before, after) {
    return Object.fromEntries(
        Object.keys(after).map((key) => [key, round((after[key] ?? 0) - (before[key] ?? 0))]),
    );
}

function round(value) {
    return Math.round(value * 100) / 100;
}

async function runImageEnvelopeCase(input) {
    const roundBrowser = (value) => Math.round(value * 100) / 100;
    const started = performance.now();
    const errors = [];
    const canvas = document.createElement('canvas');
    canvas.width = input.width;
    canvas.height = input.height;

    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    if (context === null) {
        throw new Error('Canvas 2D context is unavailable.');
    }

    if (input.fillMode === 'solid') {
        context.fillStyle = '#36a269';
    } else {
        const gradient = context.createLinearGradient(0, 0, input.width, input.height);
        gradient.addColorStop(0, '#123456');
        gradient.addColorStop(0.5, '#36a269');
        gradient.addColorStop(1, '#f2c14e');
        context.fillStyle = gradient;
    }
    context.fillRect(0, 0, input.width, input.height);
    context.fillStyle = 'rgba(255, 255, 255, 0.65)';
    context.fillRect(0, 0, Math.min(input.width, 256), Math.min(input.height, 256));

    const encodedStarted = performance.now();
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (value) => {
                if (value === null) reject(new Error(`Encoding ${input.mediaType} failed.`));
                else resolve(value);
            },
            input.mediaType,
            input.quality,
        );
    });
    const encodedMs = performance.now() - encodedStarted;

    const decodeStarted = performance.now();
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'none' });
    const decodeMs = performance.now() - decodeStarted;
    if (bitmap.width !== input.width || bitmap.height !== input.height) {
        errors.push(
            `Decoded dimensions ${bitmap.width}x${bitmap.height} did not match expected ${input.width}x${input.height}.`,
        );
    }

    const renderStarted = performance.now();
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise((resolve, reject) => {
        image.onload = () => resolve(undefined);
        image.onerror = () => reject(new Error('Rendered image failed to load.'));
    });
    image.src = objectUrl;
    document.body.append(image);
    await loaded;
    const renderMs = performance.now() - renderStarted;

    const disposeStarted = performance.now();
    image.remove();
    URL.revokeObjectURL(objectUrl);
    bitmap.close();
    canvas.width = 1;
    canvas.height = 1;
    const disposeMs = performance.now() - disposeStarted;

    const totalMs = performance.now() - started;
    const decodedPixels = input.width * input.height;
    const nominalDecodedRgbaBytes = decodedPixels * 4;

    if (decodedPixels > 40_000_000) errors.push('Decoded pixel count exceeded V1 envelope.');
    if (blob.size > 25 * 1024 * 1024) errors.push('Encoded byte size exceeded V1 envelope.');
    if (input.width > 16_384 || input.height > 16_384)
        errors.push('Dimension exceeded V1 envelope.');
    if (nominalDecodedRgbaBytes > 160_000_000) {
        errors.push('Nominal decoded RGBA bytes exceeded V1 envelope.');
    }
    if (totalMs > input.thresholdTotalMs) {
        errors.push(
            `Total time ${Math.round(totalMs)}ms exceeded threshold ${input.thresholdTotalMs}ms.`,
        );
    }

    return {
        name: input.name,
        mediaType: input.mediaType,
        width: input.width,
        height: input.height,
        encodedBytes: blob.size,
        decodedPixels,
        nominalDecodedRgbaBytes,
        timings: {
            encodeMs: roundBrowser(encodedMs),
            decodeMs: roundBrowser(decodeMs),
            renderMs: roundBrowser(renderMs),
            disposeMs: roundBrowser(disposeMs),
            totalMs: roundBrowser(totalMs),
        },
        status: errors.length === 0 ? 'passed' : 'failed',
        errors,
    };
}
