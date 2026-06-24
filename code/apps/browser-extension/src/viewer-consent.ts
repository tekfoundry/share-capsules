export interface ViewerConsentScope {
    readonly siteOrigin: string;
    readonly ctxIssuer: string;
    readonly policySha256: string;
}

export interface ViewerConsentStorage {
    get(keys: readonly string[]): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
}

export interface ViewerDisclosureConsentRecord extends ViewerConsentScope {
    readonly type: 'share-capsules-viewer-disclosure-consent';
    readonly version: 1;
    readonly grantedAt: string;
}

export const VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY = 'viewer_disclosure_consents_v1';

export class ViewerDisclosureConsentStore {
    public constructor(
        private readonly storage: ViewerConsentStorage,
        private readonly now: () => Date = () => new Date(),
    ) {}

    public async hasStandingConsent(scope: ViewerConsentScope): Promise<boolean> {
        const records = await this.records();
        return records.some((record) => consentKey(record) === consentKey(scope));
    }

    public async grantStandingConsent(
        scope: ViewerConsentScope,
    ): Promise<ViewerDisclosureConsentRecord> {
        const record: ViewerDisclosureConsentRecord = Object.freeze({
            type: 'share-capsules-viewer-disclosure-consent',
            version: 1,
            siteOrigin: normalizedSiteOrigin(scope.siteOrigin),
            ctxIssuer: normalizedHttpsIdentity(scope.ctxIssuer),
            policySha256: scope.policySha256,
            grantedAt: this.now().toISOString(),
        });
        const records = (await this.records()).filter(
            (existing) => consentKey(existing) !== consentKey(record),
        );
        await this.storage.set({ [VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]: [...records, record] });
        return record;
    }

    private async records(): Promise<readonly ViewerDisclosureConsentRecord[]> {
        const stored = await this.storage.get([VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]);
        if (!Array.isArray(stored[VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY])) return [];

        return stored[VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY].flatMap((value) => {
            const record = parseRecord(value);
            return record === undefined ? [] : [record];
        });
    }
}

export function viewerConsentScope(
    siteOrigin: string,
    ctxIssuer: string,
    policySha256: string,
): ViewerConsentScope {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(policySha256)) {
        throw new Error('The policy digest is invalid.');
    }
    return Object.freeze({
        siteOrigin: normalizedSiteOrigin(siteOrigin),
        ctxIssuer: normalizedHttpsIdentity(ctxIssuer),
        policySha256,
    });
}

function parseRecord(value: unknown): ViewerDisclosureConsentRecord | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    try {
        if (
            record.type !== 'share-capsules-viewer-disclosure-consent' ||
            record.version !== 1 ||
            typeof record.siteOrigin !== 'string' ||
            typeof record.ctxIssuer !== 'string' ||
            typeof record.policySha256 !== 'string' ||
            typeof record.grantedAt !== 'string' ||
            Number.isNaN(Date.parse(record.grantedAt))
        ) {
            return undefined;
        }

        return Object.freeze({
            type: 'share-capsules-viewer-disclosure-consent',
            version: 1,
            siteOrigin: normalizedSiteOrigin(record.siteOrigin),
            ctxIssuer: normalizedHttpsIdentity(record.ctxIssuer),
            policySha256: viewerConsentScope(
                record.siteOrigin,
                record.ctxIssuer,
                record.policySha256,
            ).policySha256,
            grantedAt: record.grantedAt,
        });
    } catch {
        return undefined;
    }
}

function consentKey(scope: ViewerConsentScope): string {
    return `${scope.siteOrigin}\n${scope.ctxIssuer}\n${scope.policySha256}`;
}

function normalizedSiteOrigin(value: string): string {
    const url = new URL(value);
    if (
        (url.protocol !== 'https:' &&
            !(url.protocol === 'http:' && isLocalDevelopmentHost(url.hostname))) ||
        url.hash !== '' ||
        url.username !== '' ||
        url.password !== ''
    ) {
        throw new Error('The site origin is invalid.');
    }

    return url.origin;
}

function normalizedHttpsIdentity(value: string): string {
    const url = new URL(value);
    if (
        (url.protocol !== 'https:' &&
            !(url.protocol === 'http:' && isLocalDevelopmentHost(url.hostname))) ||
        url.username !== '' ||
        url.password !== '' ||
        url.search !== '' ||
        url.hash !== ''
    ) {
        throw new Error('The provider identity is invalid.');
    }
    return url.href.endsWith('/') ? url.href.slice(0, -1) : url.href;
}

function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
