import { describe, expect, it } from 'vitest';

import {
    ViewerDisclosureConsentStore,
    viewerConsentScope,
    type ViewerConsentStorage,
} from './viewer-consent.js';

const POLICY_A = 'A'.repeat(43);
const POLICY_B = 'B'.repeat(43);

describe('Viewer disclosure consent', () => {
    it('stores standing consent scoped to site origin, CTX issuer, and signed policy digest', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(
            storage,
            () => new Date('2026-06-23T12:00:00.000Z'),
        );
        const scope = viewerConsentScope(
            'https://example.com/gallery',
            'https://trust.example',
            POLICY_A,
        );

        await expect(store.hasStandingConsent(scope)).resolves.toBe(false);
        await store.grantStandingConsent(scope);

        await expect(
            store.hasStandingConsent(
                viewerConsentScope(
                    'https://example.com/other-page',
                    'https://trust.example',
                    POLICY_A,
                ),
            ),
        ).resolves.toBe(true);
        await expect(
            store.hasStandingConsent(
                viewerConsentScope('https://other.example', 'https://trust.example', POLICY_A),
            ),
        ).resolves.toBe(false);
        await expect(
            store.hasStandingConsent(
                viewerConsentScope('https://example.com', 'https://other-trust.example', POLICY_A),
            ),
        ).resolves.toBe(false);
        await expect(
            store.hasStandingConsent(
                viewerConsentScope('https://example.com', 'https://trust.example', POLICY_B),
            ),
        ).resolves.toBe(false);
    });

    it('deduplicates repeated grants and drops malformed stored records', async () => {
        const storage = new MemoryStorage();
        storage.values.viewer_disclosure_consents_v1 = [
            { nope: true },
            {
                type: 'share-capsules-viewer-disclosure-consent',
                version: 1,
                siteOrigin: 'https://example.com',
                ctxIssuer: 'https://trust.example',
                policySha256: POLICY_A,
                grantedAt: 'not-a-date',
            },
        ];
        const store = new ViewerDisclosureConsentStore(storage);
        const scope = viewerConsentScope('https://example.com', 'https://trust.example', POLICY_A);

        await store.grantStandingConsent(scope);
        await store.grantStandingConsent(scope);

        expect(storage.values.viewer_disclosure_consents_v1).toEqual([
            expect.objectContaining({
                type: 'share-capsules-viewer-disclosure-consent',
                version: 1,
                siteOrigin: 'https://example.com',
                ctxIssuer: 'https://trust.example',
                policySha256: POLICY_A,
            }),
        ]);
    });

    it('rejects invalid consent scopes before storage', () => {
        expect(() =>
            viewerConsentScope('javascript:alert(1)', 'https://trust.example', POLICY_A),
        ).toThrow();
        expect(() =>
            viewerConsentScope('https://example.com', 'https://trust.example?x=1', POLICY_A),
        ).toThrow();
        expect(() =>
            viewerConsentScope('https://example.com', 'https://trust.example', 'short'),
        ).toThrow();
    });
});

class MemoryStorage implements ViewerConsentStorage {
    public readonly values: Record<string, unknown> = {};

    public async get(keys: readonly string[]): Promise<Record<string, unknown>> {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
    }

    public async set(items: Record<string, unknown>): Promise<void> {
        Object.assign(this.values, structuredClone(items));
    }
}
