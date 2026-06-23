import { describe, expect, it } from 'vitest';

import {
    isSupportedCapsuleUrl,
    normalizeCapsuleViewerCandidate,
    parseViewerStateMessage,
    viewerDebugEnabled,
    viewerFrameUrl,
    viewerHeight,
    viewerImageFit,
    viewerStateMessage,
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
            debug: false,
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

    it('builds an extension Viewer frame URL without exposing fallback content', () => {
        expect(
            viewerFrameUrl(
                'chrome-extension://extension-id/viewer-frame.html',
                'https://example.com/capsules/a.capsule',
                'https://example.com',
            ),
        ).toBe(
            'chrome-extension://extension-id/viewer-frame.html?capsule=https%3A%2F%2Fexample.com%2Fcapsules%2Fa.capsule&site=https%3A%2F%2Fexample.com',
        );
        expect(
            viewerFrameUrl(
                'chrome-extension://extension-id/viewer-frame.html',
                'https://example.com/capsules/a.capsule',
                'https://example.com',
                true,
                'cover',
            ),
        ).toBe(
            'chrome-extension://extension-id/viewer-frame.html?capsule=https%3A%2F%2Fexample.com%2Fcapsules%2Fa.capsule&site=https%3A%2F%2Fexample.com&debug=1&image_fit=cover',
        );
    });

    it('treats the debug attribute as an explicit opt-in', () => {
        expect(viewerDebugEnabled(fakeElementWithDebug(''))).toBe(true);
        expect(viewerDebugEnabled(fakeElementWithDebug('true'))).toBe(true);
        expect(viewerDebugEnabled(fakeElementWithDebug('false'))).toBe(false);
        expect(viewerDebugEnabled(fakeElementWithDebug('0'))).toBe(false);
        expect(viewerDebugEnabled(fakeElementWithDebug(null))).toBe(false);
    });

    it('accepts a small reviewed set of presentation attributes', () => {
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'cover' }))).toBe('cover');
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'fill' }))).toBe('fill');
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'full-height' }))).toBe(
            'full-height',
        );
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'scale-down' }))).toBe('scale-down');
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'contain' }))).toBe('contain');
        expect(viewerImageFit(fakeElementWithAttributes({ fit: 'position:absolute' }))).toBe(
            'contain',
        );
        expect(viewerImageFit(fakeElementWithAttributes({ 'image-fit': 'cover' }))).toBe('cover');
        expect(viewerHeight(fakeElementWithAttributes({ 'viewer-height': '420px' }))).toBe('420px');
        expect(viewerHeight(fakeElementWithAttributes({ 'viewer-height': '70vh' }))).toBe('70vh');
        expect(viewerHeight(fakeElementWithAttributes({ 'viewer-height': 'calc(100vh)' }))).toBe(
            undefined,
        );
        expect(viewerHeight(fakeElementWithAttributes({ 'viewer-height': '0px' }))).toBe(undefined);
    });

    it('accepts only the viewer opened state message shape', () => {
        const message = viewerStateMessage('https://example.com/capsules/a.capsule', 'opened', {
            title: 'Eclipse Photo',
            description: 'A protected photo.',
        });

        expect(parseViewerStateMessage(message)).toEqual(message);
        expect(parseViewerStateMessage({ ...message, state: 'locked' })).toBeUndefined();
        expect(parseViewerStateMessage({ ...message, detail: 'secret' })).toEqual(message);
        expect(parseViewerStateMessage({ type: 'other', state: 'opened' })).toBeUndefined();
        expect(
            parseViewerStateMessage(
                viewerStateMessage('https://example.com/capsules/a.capsule', 'action_required'),
            ),
        ).toEqual(viewerStateMessage('https://example.com/capsules/a.capsule', 'action_required'));
        expect(
            parseViewerStateMessage(
                viewerStateMessage('https://example.com/capsules/a.capsule', 'error', {
                    errorMessage: 'Capsule unavailable.',
                }),
            ),
        ).toEqual(
            viewerStateMessage('https://example.com/capsules/a.capsule', 'error', {
                errorMessage: 'Capsule unavailable.',
            }),
        );
    });
});

function fakeElementWithDebug(value: string | null): HTMLElement {
    return {
        getAttribute: (name: string) => (name === 'debug' ? value : null),
    } as HTMLElement;
}

function fakeElementWithAttributes(attributes: Record<string, string>): HTMLElement {
    return {
        getAttribute: (name: string) => attributes[name] ?? null,
    } as HTMLElement;
}
