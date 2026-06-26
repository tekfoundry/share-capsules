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

    it('lists standing privacy controls with exact disclosure, measurement, retention, and automatic-opening scopes', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(
            storage,
            () => new Date('2026-06-23T12:00:00.000Z'),
        );

        await store.grantStandingConsent(
            viewerConsentScope('https://example.com/gallery', 'https://trust.example', POLICY_A),
        );

        await expect(store.listStandingConsents()).resolves.toEqual([
            {
                type: 'share-capsules-viewer-disclosure-consent',
                version: 1,
                siteOrigin: 'https://example.com',
                ctxIssuer: 'https://trust.example',
                policySha256: POLICY_A,
                grantedAt: '2026-06-23T12:00:00.000Z',
                automaticOpening: 'enabled-for-matching-site-issuer-and-policy',
                ctxDisclosureScope: 'account-device-policy-limits-and-key-release',
                measurementScope: 'view-event-accounting-on-successful-key-release',
                retentionScope: 'provider-retention-policy',
                sitePermissionPattern: 'https://example.com/*',
            },
        ]);
    });

    it('revokes one standing consent without removing other site or policy scopes', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(storage);
        const first = viewerConsentScope('https://example.com', 'https://trust.example', POLICY_A);
        const second = viewerConsentScope('https://example.com', 'https://trust.example', POLICY_B);
        const third = viewerConsentScope(
            'https://other.example',
            'https://trust.example',
            POLICY_A,
        );

        await store.grantStandingConsent(first);
        await store.grantStandingConsent(second);
        await store.grantStandingConsent(third);

        await expect(store.revokeStandingConsent(first)).resolves.toBe(true);
        await expect(store.revokeStandingConsent(first)).resolves.toBe(false);
        await expect(store.hasStandingConsent(first)).resolves.toBe(false);
        await expect(store.hasStandingConsent(second)).resolves.toBe(true);
        await expect(store.hasStandingConsent(third)).resolves.toBe(true);
    });

    it('revokes all standing consents for a normalized site origin', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(storage);

        await store.grantStandingConsent(
            viewerConsentScope('https://example.com/gallery', 'https://trust.example', POLICY_A),
        );
        await store.grantStandingConsent(
            viewerConsentScope('https://example.com/other', 'https://trust.example', POLICY_B),
        );
        await store.grantStandingConsent(
            viewerConsentScope('https://other.example', 'https://trust.example', POLICY_A),
        );

        await expect(store.revokeSiteConsents('https://example.com/settings')).resolves.toBe(2);
        await expect(store.listStandingConsents()).resolves.toEqual([
            expect.objectContaining({ siteOrigin: 'https://other.example' }),
        ]);
    });

    it('clears standing consents and returns the number removed', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(storage);

        await store.grantStandingConsent(
            viewerConsentScope('https://example.com', 'https://trust.example', POLICY_A),
        );
        await store.grantStandingConsent(
            viewerConsentScope('https://other.example', 'https://trust.example', POLICY_A),
        );

        await expect(store.clearStandingConsents()).resolves.toBe(2);
        await expect(store.listStandingConsents()).resolves.toEqual([]);
    });

    it('does not report revoked consent when durable storage fails', async () => {
        const storage = new MemoryStorage();
        const store = new ViewerDisclosureConsentStore(storage);
        const scope = viewerConsentScope('https://example.com', 'https://trust.example', POLICY_A);
        await store.grantStandingConsent(scope);
        storage.failWrites = true;

        await expect(store.revokeStandingConsent(scope)).rejects.toThrow('storage unavailable');
        storage.failWrites = false;
        await expect(store.hasStandingConsent(scope)).resolves.toBe(true);
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
    public failWrites = false;

    public async get(keys: readonly string[]): Promise<Record<string, unknown>> {
        return Object.fromEntries(keys.map((key) => [key, this.values[key]]));
    }

    public async set(items: Record<string, unknown>): Promise<void> {
        if (this.failWrites) throw new Error('storage unavailable');
        Object.assign(this.values, structuredClone(items));
    }
}
