import { describe, expect, it } from 'vitest';

import {
    isSupportedCapsuleUrl,
    normalizeCapsuleViewerCandidate,
} from './viewer-capsule-discovery.js';

describe('Viewer Capsule discovery', () => {
    it('resolves explicit Capsule sources against the Host document URL', () => {
        expect(
            normalizeCapsuleViewerCandidate(
                './capsules/eclipse-photo.capsule',
                '  Protected eclipse photo.  ',
                'https://example.com/gallery/index.html',
            ),
        ).toEqual({
            capsuleUrl: 'https://example.com/gallery/capsules/eclipse-photo.capsule',
            fallbackText: 'Protected eclipse photo.',
        });
    });

    it('allows HTTPS Capsules and local development HTTP Capsules only', () => {
        expect(isSupportedCapsuleUrl(new URL('https://example.com/capsules/a.capsule'))).toBe(true);
        expect(isSupportedCapsuleUrl(new URL('http://127.0.0.1:8088/capsules/a.capsule'))).toBe(
            true,
        );
        expect(isSupportedCapsuleUrl(new URL('http://localhost:8088/capsules/a.capsule'))).toBe(
            true,
        );
        expect(isSupportedCapsuleUrl(new URL('http://example.com/capsules/a.capsule'))).toBe(false);
        expect(isSupportedCapsuleUrl(new URL('https://user:pass@example.com/a.capsule'))).toBe(
            false,
        );
    });

    it('rejects missing or malformed Capsule sources without throwing', () => {
        expect(normalizeCapsuleViewerCandidate(null, 'Fallback', 'https://example.com/')).toBe(
            undefined,
        );
        expect(normalizeCapsuleViewerCandidate(' ', 'Fallback', 'https://example.com/')).toBe(
            undefined,
        );
        expect(
            normalizeCapsuleViewerCandidate('https://[bad', 'Fallback', 'https://example.com/'),
        ).toBeUndefined();
    });
});
