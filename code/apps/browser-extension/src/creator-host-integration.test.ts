import { describe, expect, it } from 'vitest';

import {
    CreatorHostIntegrationError,
    createCreatorHostIntegrationV1,
    exampleCapsuleUrlForFilename,
} from './creator-host-integration.js';

describe('Creator Host integration guidance', () => {
    it('creates copyable declarative markup with public fallback content', () => {
        expect(
            createCreatorHostIntegrationV1({
                capsuleUrl: 'https://static.example/capsules/artwork-01.capsule',
                fallbackText: 'Protected artwork preview',
            }),
        ).toEqual({
            version: 1,
            capsuleUrl: 'https://static.example/capsules/artwork-01.capsule',
            fallbackText: 'Protected artwork preview',
            markup: `<capsule-viewer src="https://static.example/capsules/artwork-01.capsule">
  <p>Protected artwork preview</p>
</capsule-viewer>`,
        });
    });

    it('creates example.com URLs from the saved Capsule file name', () => {
        expect(exampleCapsuleUrlForFilename('artwork-01.capsule')).toBe(
            'https://example.com/capsules/artwork-01.capsule',
        );
        expect(() => exampleCapsuleUrlForFilename('../artwork.capsule')).toThrow(
            new CreatorHostIntegrationError('capsule_url'),
        );
    });

    it('escapes fallback text as public HTML content rather than executable markup', () => {
        expect(
            createCreatorHostIntegrationV1({
                capsuleUrl: 'https://static.example/a&b.capsule',
                fallbackText: '<script>alert("no")</script> & description',
            }).markup,
        ).toBe(`<capsule-viewer src="https://static.example/a&amp;b.capsule">
  <p>&lt;script&gt;alert("no")&lt;/script&gt; &amp; description</p>
</capsule-viewer>`);
    });

    it.each([
        'http://static.example/file.capsule',
        'https://user:secret@static.example/file.capsule',
        'https://static.example/file.capsule?token=secret',
        'https://static.example/file.capsule#fragment',
        '/capsules/file.capsule',
        ' https://static.example/file.capsule',
    ])('rejects an unsafe or non-public Capsule URL: %s', (capsuleUrl) => {
        expect(() =>
            createCreatorHostIntegrationV1({ capsuleUrl, fallbackText: 'Fallback' }),
        ).toThrow(new CreatorHostIntegrationError('capsule_url'));
    });

    it.each(['', ' ', ' padded', 'padded ', 'bad\u0000text'])(
        'rejects invalid public fallback text: %j',
        (fallbackText) => {
            expect(() =>
                createCreatorHostIntegrationV1({
                    capsuleUrl: 'https://static.example/file.capsule',
                    fallbackText,
                }),
            ).toThrow(new CreatorHostIntegrationError('fallback_text'));
        },
    );
});
