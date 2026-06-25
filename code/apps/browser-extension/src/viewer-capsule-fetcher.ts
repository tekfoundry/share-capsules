import { isSupportedCapsuleUrl } from './viewer-capsule-discovery.js';

export const VIEWER_CAPSULE_MAX_BYTES = 64 * 1024 * 1024;
export const VIEWER_CAPSULE_MAX_REDIRECTS = 3;
export const VIEWER_CAPSULE_TIMEOUT_MS = 15_000;

export type ViewerCapsuleFetchFailureCode =
    | 'unsupported_url'
    | 'missing_host_permission'
    | 'too_many_redirects'
    | 'redirect_without_location'
    | 'unexpected_status'
    | 'too_large'
    | 'empty_body'
    | 'network_error';

export type ViewerCapsuleFetchResult =
    | {
          readonly ok: true;
          readonly url: string;
          readonly bytes: Uint8Array;
      }
    | {
          readonly ok: false;
          readonly code: ViewerCapsuleFetchFailureCode;
          readonly origin?: string;
          readonly permission?: string;
      };

export interface ViewerCapsuleFetchOptions {
    readonly fetch?: typeof fetch;
    readonly hostPermissions?: ViewerCapsuleHostPermissions;
    readonly maxBytes?: number;
    readonly maxRedirects?: number;
    readonly timeoutMs?: number;
}

export interface ViewerCapsuleHostPermissions {
    contains(permission: string): Promise<boolean>;
}

export async function fetchViewerCapsule(
    capsuleUrl: string,
    options: ViewerCapsuleFetchOptions = {},
): Promise<ViewerCapsuleFetchResult> {
    const maxBytes = options.maxBytes ?? VIEWER_CAPSULE_MAX_BYTES;
    const maxRedirects = options.maxRedirects ?? VIEWER_CAPSULE_MAX_REDIRECTS;
    const timeoutMs = options.timeoutMs ?? VIEWER_CAPSULE_TIMEOUT_MS;
    const fetchImplementation = options.fetch ?? fetch;
    const hostPermissions = options.hostPermissions;
    let currentUrl = normalizedFetchUrl(capsuleUrl);
    if (currentUrl === undefined) return { ok: false, code: 'unsupported_url' };

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
        const permission = viewerHostPermissionPattern(currentUrl);
        if (hostPermissions !== undefined && !(await hostPermissions.contains(permission))) {
            return {
                ok: false,
                code: 'missing_host_permission',
                origin: new URL(currentUrl).origin,
                permission,
            };
        }

        const attempt = await fetchAttempt(fetchImplementation, currentUrl, timeoutMs);
        if (attempt.response === undefined) {
            return { ok: false, code: attempt.timedOut ? 'network_error' : 'network_error' };
        }

        if (isRedirectStatus(attempt.response.status)) {
            if (redirectCount === maxRedirects) return { ok: false, code: 'too_many_redirects' };
            const location = attempt.response.headers.get('location');
            if (location === null || location.trim() === '') {
                return { ok: false, code: 'redirect_without_location' };
            }
            const redirectedUrl = normalizedFetchUrl(location, currentUrl);
            if (redirectedUrl === undefined) return { ok: false, code: 'unsupported_url' };
            currentUrl = redirectedUrl;
            continue;
        }

        if (attempt.response.status !== 200) return { ok: false, code: 'unexpected_status' };
        if (contentLengthExceeds(attempt.response.headers.get('content-length'), maxBytes)) {
            return { ok: false, code: 'too_large' };
        }

        const bytes = await readBoundedBytes(attempt.response, maxBytes);
        if (bytes === undefined) return { ok: false, code: 'too_large' };
        if (bytes.byteLength === 0) return { ok: false, code: 'empty_body' };

        return { ok: true, url: currentUrl, bytes };
    }

    return { ok: false, code: 'too_many_redirects' };
}

export function viewerHostPermissionPattern(url: string): string {
    const parsed = new URL(url);
    return `${parsed.origin}/*`;
}

function normalizedFetchUrl(rawUrl: string, baseUrl?: string): string | undefined {
    let url: URL;
    try {
        url = new URL(rawUrl, baseUrl);
    } catch {
        return undefined;
    }
    if (!isSupportedCapsuleUrl(url)) return undefined;
    if (url.protocol === 'https:' && isForbiddenNetworkHostname(url.hostname)) return undefined;
    url.hash = '';
    return url.href;
}

async function fetchAttempt(
    fetchImplementation: typeof fetch,
    url: string,
    timeoutMs: number,
): Promise<{ readonly response?: Response; readonly timedOut: boolean }> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);

    try {
        return {
            response: await fetchImplementation(url, {
                cache: 'no-store',
                credentials: 'omit',
                redirect: 'manual',
                referrerPolicy: 'no-referrer',
                signal: controller.signal,
            }),
            timedOut,
        };
    } catch {
        return { timedOut };
    } finally {
        clearTimeout(timeout);
    }
}

function isRedirectStatus(status: number): boolean {
    return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function contentLengthExceeds(value: string | null, maxBytes: number): boolean {
    if (value === null) return false;
    if (!/^[0-9]+$/u.test(value)) return true;
    return Number(value) > maxBytes;
}

async function readBoundedBytes(
    response: Response,
    maxBytes: number,
): Promise<Uint8Array | undefined> {
    if (response.body === null) {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) return undefined;
        return new Uint8Array(buffer);
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
        while (true) {
            const read = await reader.read();
            if (read.done) break;
            totalBytes += read.value.byteLength;
            if (totalBytes > maxBytes) return undefined;
            chunks.push(read.value);
        }
    } finally {
        reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}

function isForbiddenNetworkHostname(hostname: string): boolean {
    const normalized = hostname.toLowerCase();
    if (
        normalized === 'localhost' ||
        normalized === '[::1]' ||
        normalized.endsWith('.localhost') ||
        normalized.endsWith('.local')
    ) {
        return true;
    }

    const ipv4 = parseDottedIpv4(normalized);
    if (ipv4 !== undefined) return isForbiddenIpv4(ipv4);

    if (
        normalized.startsWith('fe80:') ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd')
    ) {
        return true;
    }

    return false;
}

function parseDottedIpv4(hostname: string): readonly [number, number, number, number] | undefined {
    const parts = hostname.split('.');
    if (parts.length !== 4) return undefined;
    const first = parseIpv4Part(parts[0]);
    const second = parseIpv4Part(parts[1]);
    const third = parseIpv4Part(parts[2]);
    const fourth = parseIpv4Part(parts[3]);
    if (
        first === undefined ||
        second === undefined ||
        third === undefined ||
        fourth === undefined
    ) {
        return undefined;
    }
    return [first, second, third, fourth];
}

function parseIpv4Part(part: string | undefined): number | undefined {
    if (part === undefined || !/^[0-9]{1,3}$/u.test(part)) return undefined;
    const value = Number(part);
    return value <= 255 ? value : undefined;
}

function isForbiddenIpv4([first, second]: readonly [number, number, number, number]): boolean {
    if (first === 0 || first === 10 || first === 127) return true;
    if (first === 169 && second === 254) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    if (first === 100 && second >= 64 && second <= 127) return true;
    return false;
}
