import { describe, expect, it } from 'vitest';

import {
    fetchViewerCapsule,
    VIEWER_CAPSULE_MAX_BYTES,
    VIEWER_CAPSULE_MAX_REDIRECTS,
    viewerHostPermissionPattern,
} from './viewer-capsule-fetcher.js';

describe('Viewer Capsule fetcher', () => {
    it('fetches Capsule bytes anonymously without following redirects automatically', async () => {
        const requests: RequestInit[] = [];
        const result = await fetchViewerCapsule('https://example.com/capsules/a.capsule', {
            fetch: async (_url, init) => {
                requests.push(init ?? {});
                return new Response(new Uint8Array([1, 2, 3]), {
                    status: 200,
                    headers: { 'content-length': '3' },
                });
            },
        });

        expect(result).toEqual({
            ok: true,
            url: 'https://example.com/capsules/a.capsule',
            bytes: new Uint8Array([1, 2, 3]),
        });
        expect(requests).toHaveLength(1);
        expect(requests[0]).toMatchObject({
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'manual',
            referrerPolicy: 'no-referrer',
        });
    });

    it('bounds redirect count and revalidates each redirect target', async () => {
        const visitedUrls: string[] = [];
        const result = await fetchViewerCapsule('https://example.com/start.capsule', {
            fetch: async (url) => {
                visitedUrls.push(url.toString());
                if (url.toString().endsWith('/start.capsule')) {
                    return redirectResponse('/next.capsule');
                }
                return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
            },
        });

        expect(result).toEqual({
            ok: true,
            url: 'https://example.com/next.capsule',
            bytes: new Uint8Array([4, 5, 6]),
        });
        expect(visitedUrls).toEqual([
            'https://example.com/start.capsule',
            'https://example.com/next.capsule',
        ]);

        await expect(
            fetchViewerCapsule('https://example.com/start.capsule', {
                maxRedirects: VIEWER_CAPSULE_MAX_REDIRECTS,
                fetch: async () => redirectResponse('/again.capsule'),
            }),
        ).resolves.toEqual({ ok: false, code: 'too_many_redirects' });

        await expect(
            fetchViewerCapsule('https://example.com/start.capsule', {
                fetch: async () => redirectResponse('http://example.com/insecure.capsule'),
            }),
        ).resolves.toEqual({ ok: false, code: 'unsupported_url' });
    });

    it('requires a separate runtime Host permission before fetching each Capsule origin', async () => {
        const fetchShouldNotRun = async (): Promise<Response> => {
            throw new Error('fetch should not run before Host permission is granted');
        };

        await expect(
            fetchViewerCapsule('https://capsules.example/artwork.capsule', {
                fetch: fetchShouldNotRun,
                hostPermissions: { contains: async () => false },
            }),
        ).resolves.toEqual({
            ok: false,
            code: 'missing_host_permission',
            origin: 'https://capsules.example',
            permission: 'https://capsules.example/*',
        });
    });

    it('requires the redirected Capsule origin even after the first origin is allowed', async () => {
        const visitedUrls: string[] = [];
        const granted = new Set(['https://capsules.example/*']);
        const result = await fetchViewerCapsule('https://capsules.example/start.capsule', {
            hostPermissions: {
                contains: async (permission) => granted.has(permission),
            },
            fetch: async (url) => {
                visitedUrls.push(url.toString());
                return redirectResponse('https://cdn.example/final.capsule');
            },
        });

        expect(result).toEqual({
            ok: false,
            code: 'missing_host_permission',
            origin: 'https://cdn.example',
            permission: 'https://cdn.example/*',
        });
        expect(visitedUrls).toEqual(['https://capsules.example/start.capsule']);
    });

    it('rejects credentialed, private-network, and non-HTTPS public Capsule URLs', async () => {
        const fetchShouldNotRun = async (): Promise<Response> => {
            throw new Error('fetch should not run');
        };

        await expect(
            fetchViewerCapsule('https://user:pass@example.com/a.capsule', {
                fetch: fetchShouldNotRun,
            }),
        ).resolves.toEqual({ ok: false, code: 'unsupported_url' });

        await expect(
            fetchViewerCapsule('https://127.0.0.1/a.capsule', { fetch: fetchShouldNotRun }),
        ).resolves.toEqual({ ok: false, code: 'unsupported_url' });

        await expect(
            fetchViewerCapsule('https://192.168.1.10/a.capsule', { fetch: fetchShouldNotRun }),
        ).resolves.toEqual({ ok: false, code: 'unsupported_url' });

        await expect(
            fetchViewerCapsule('http://example.com/a.capsule', { fetch: fetchShouldNotRun }),
        ).resolves.toEqual({ ok: false, code: 'unsupported_url' });
    });

    it('allows local HTTP only for the development example Host', async () => {
        await expect(
            fetchViewerCapsule('http://localhost:8088/capsules/a.capsule', {
                fetch: async () => new Response(new Uint8Array([7]), { status: 200 }),
            }),
        ).resolves.toEqual({
            ok: true,
            url: 'http://localhost:8088/capsules/a.capsule',
            bytes: new Uint8Array([7]),
        });
    });

    it('derives exact origin Host permission patterns for Capsule fetches', () => {
        expect(viewerHostPermissionPattern('https://capsules.example/a/b.capsule')).toBe(
            'https://capsules.example/*',
        );
        expect(viewerHostPermissionPattern('https://capsules.example:8443/a.capsule')).toBe(
            'https://capsules.example:8443/*',
        );
        expect(viewerHostPermissionPattern('http://localhost:8088/capsules/a.capsule')).toBe(
            'http://localhost:8088/*',
        );
    });

    it('fails closed on unsafe statuses, missing redirect locations, and oversized bodies', async () => {
        await expect(
            fetchViewerCapsule('https://example.com/a.capsule', {
                fetch: async () => new Response(null, { status: 404 }),
            }),
        ).resolves.toEqual({ ok: false, code: 'unexpected_status' });

        await expect(
            fetchViewerCapsule('https://example.com/a.capsule', {
                fetch: async () => new Response(null, { status: 302 }),
            }),
        ).resolves.toEqual({ ok: false, code: 'redirect_without_location' });

        await expect(
            fetchViewerCapsule('https://example.com/a.capsule', {
                maxBytes: VIEWER_CAPSULE_MAX_BYTES,
                fetch: async () =>
                    new Response(new Uint8Array([1]), {
                        status: 200,
                        headers: { 'content-length': String(VIEWER_CAPSULE_MAX_BYTES + 1) },
                    }),
            }),
        ).resolves.toEqual({ ok: false, code: 'too_large' });

        await expect(
            fetchViewerCapsule('https://example.com/a.capsule', {
                maxBytes: 2,
                fetch: async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
            }),
        ).resolves.toEqual({ ok: false, code: 'too_large' });
    });
});

function redirectResponse(location: string): Response {
    return new Response(null, { status: 302, headers: { location } });
}
