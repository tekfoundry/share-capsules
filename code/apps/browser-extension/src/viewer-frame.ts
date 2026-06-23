import { fetchViewerCapsule } from './viewer-capsule-fetcher.js';
import {
    verifyFetchedViewerCapsule,
    type VerifiedViewerCapsuleSummary,
} from './viewer-capsule-verifier.js';
import {
    VIEWER_CREDENTIAL_STORAGE_KEYS,
    ViewerAccountConnector,
    ViewerCredentialStore,
} from './viewer-account-connection.js';
import { ViewerDisclosureConsentStore, viewerConsentScope } from './viewer-consent.js';
import {
    FetchViewerDeviceRegistrationTransport,
    IndexedDbViewerDeviceKeyStore,
    ViewerDeviceRegistrar,
} from './viewer-device.js';
import {
    ExtensionOAuthClient,
    FetchOAuthTokenTransport,
    type ExtensionIdentityFlow,
    type OAuthTokenSet,
} from './oauth.js';
import { ViewerCtxAuthorizationClient } from './viewer-ctx-authorization.js';
import {
    ViewerBrokerRedemptionClient,
    type ViewerBrokerRedemptionResult,
} from './viewer-broker-redemption.js';
import {
    viewerOpenSlotAcquireMessage,
    viewerOpenSlotReleaseMessage,
    type ViewerOpenSlotAcquireResponse,
} from './viewer-open-queue.js';
import { viewerStateMessage } from './viewer-capsule-discovery.js';
import {
    ViewerPayloadRenderer,
    type ViewerPayloadRenderResult,
} from './viewer-payload-renderer.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

declare const chrome: {
    readonly storage: {
        readonly local: {
            get(keys: readonly string[]): Promise<Record<string, unknown>>;
            set(items: Record<string, unknown>): Promise<void>;
        };
        readonly onChanged: {
            addListener(
                listener: (
                    changes: Record<
                        string,
                        { readonly oldValue?: unknown; readonly newValue?: unknown }
                    >,
                    areaName: string,
                ) => void,
            ): void;
            removeListener(
                listener: (
                    changes: Record<
                        string,
                        { readonly oldValue?: unknown; readonly newValue?: unknown }
                    >,
                    areaName: string,
                ) => void,
            ): void;
        };
    };
    readonly identity: {
        launchWebAuthFlow(details: {
            readonly url: string;
            readonly interactive: boolean;
        }): Promise<string | undefined>;
    };
    readonly runtime: {
        sendMessage(message: unknown): Promise<unknown>;
    };
};

const CONTROL_PLANE = 'http://localhost:3003';
const DEVELOPMENT_EXTENSION_ID = 'dhconceamghcnndjodjhjikknblhkmej';
const OAUTH_CLIENT_ID = '01977ac8-793e-72d4-a234-bd581e773e7e';

const frameParameters = new URL(location.href).searchParams;
const capsuleUrl = frameParameters.get('capsule');
const siteOrigin = frameParameters.get('site');
const debugEnabled = frameParameters.get('debug') === '1';
const imageFit = viewerImageFitParameter(frameParameters.get('image_fit'));
const shellElement = document.querySelector('.viewer-shell');
const statusElement = document.querySelector('[data-viewer-status]');
const urlElement = document.querySelector('[data-viewer-capsule-url]');
const actionsElement = document.querySelector('[data-viewer-actions]');
const renderElement = document.querySelector('[data-viewer-render]');
const headingElement = document.querySelector('[data-viewer-heading]');
let activeRenderedPayload: ViewerPayloadRenderResult | undefined;
let stopWaitingForViewerCredentials: (() => void) | undefined;
let resumeAfterConnectionRunning = false;
let activeOpenSlotRelease: (() => Promise<void>) | undefined;

void initializeViewerFrame();

async function initializeViewerFrame(): Promise<void> {
    document.body.dataset.imageFit = imageFit;
    if (
        !(statusElement instanceof HTMLElement) ||
        !(urlElement instanceof HTMLElement) ||
        !(actionsElement instanceof HTMLElement) ||
        !(renderElement instanceof HTMLElement)
    ) {
        return;
    }
    if (capsuleUrl === null || capsuleUrl.trim() === '') {
        statusElement.textContent = 'No Capsule URL was provided to this Viewer frame.';
        urlElement.textContent = '';
        return;
    }
    if (siteOrigin === null || siteOrigin.trim() === '') {
        statusElement.textContent = 'No Host site origin was provided to this Viewer frame.';
        urlElement.textContent = capsuleUrl;
        return;
    }

    debugLog('frame_initialized', { siteOrigin, capsuleOrigin: safeOrigin(capsuleUrl) });
    statusElement.textContent = 'Fetching this Capsule safely before verification.';
    urlElement.textContent = capsuleUrl;

    const fetchResult = await fetchViewerCapsule(capsuleUrl);
    if (!fetchResult.ok) {
        debugLog('fetch_failed', { code: fetchResult.code });
        statusElement.textContent =
            'This Capsule could not be fetched safely. The protected content remains locked.';
        postViewerState('error', {
            errorMessage: 'This Capsule could not be fetched safely.',
        });
        return;
    }
    debugLog('fetched', {
        bytes: fetchResult.bytes.byteLength,
        capsuleOrigin: safeOrigin(fetchResult.url),
    });

    statusElement.textContent = `Capsule fetched safely (${formatBytes(fetchResult.bytes.byteLength)}). Verifying its signed package.`;
    urlElement.textContent = fetchResult.url;

    const verificationResult = await verifyFetchedViewerCapsule(fetchResult.bytes);
    if (!verificationResult.ok) {
        debugLog('verification_failed', { code: verificationResult.code });
        statusElement.textContent =
            'This Capsule could not be verified safely. The protected content remains locked.';
        postViewerState('error', {
            errorMessage: 'This Capsule could not be verified safely.',
        });
        return;
    }
    debugLog('verified', debugSummary(verificationResult.summary));

    await renderAuthorizationGate(
        statusElement,
        actionsElement,
        siteOrigin,
        verificationResult.summary,
        verificationResult.encryptedPayload,
    );
}

function viewerImageFitParameter(
    value: string | null,
): 'contain' | 'cover' | 'fill' | 'full-height' | 'scale-down' {
    return value === 'cover' ||
        value === 'fill' ||
        value === 'full-height' ||
        value === 'scale-down'
        ? value
        : 'contain';
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function renderAuthorizationGate(
    status: HTMLElement,
    actions: HTMLElement,
    currentSiteOrigin: string,
    summary: VerifiedViewerCapsuleSummary,
    encryptedPayload: Uint8Array,
): Promise<void> {
    const runtime = viewerRuntime();
    const active = await runtime.credentials.active();
    const scope = viewerConsentScope(currentSiteOrigin, summary.ctxIssuer, summary.policySha256);
    const hasStandingConsent = await runtime.consents.hasStandingConsent(scope);
    actions.replaceChildren();

    if (active === undefined) {
        debugLog('account_connection_required', debugSummary(summary));
        postViewerState('action_required', metadataFromSummary(summary));
        waitForSharedViewerCredential(async () => {
            await renderAuthorizationGate(
                status,
                actions,
                currentSiteOrigin,
                summary,
                encryptedPayload,
            );
        });
        status.textContent = `Verified “${summary.title ?? 'Capsule'}”. Connect your Share Capsules account to continue.`;
        const connect = button('Connect account');
        connect.addEventListener('click', () => {
            void withDisabledButton(connect, async () => {
                status.textContent =
                    'Connecting your Share Capsules account and registered device.';
                await runtime.connector.ensureConnected('Viewer extension');
                await resumeAfterSharedConnection(async () => {
                    await renderAuthorizationGate(
                        status,
                        actions,
                        currentSiteOrigin,
                        summary,
                        encryptedPayload,
                    );
                });
            });
        });
        actions.append(connect);
        return;
    }

    stopWaitingForViewerCredentials?.();
    if (hasStandingConsent) {
        debugLog('standing_consent_available', debugSummary(summary));
        await authorizeVerifiedCapsule(
            status,
            runtime,
            summary,
            encryptedPayload,
            active.token,
            active.device,
        );
        return;
    }

    debugLog('consent_required', debugSummary(summary));
    postViewerState('action_required', metadataFromSummary(summary));
    status.textContent = `Verified “${summary.title ?? 'Capsule'}”. Approve view-event accounting before authorization.`;
    const remember = checkbox(
        'Remember this consent for this site when the signed policy is unchanged.',
    );
    const approve = button('Approve and continue');
    approve.addEventListener('click', () => {
        void withDisabledButton(approve, async () => {
            if (remember.input.checked) await runtime.consents.grantStandingConsent(scope);
            actions.replaceChildren();
            await authorizeVerifiedCapsule(
                status,
                runtime,
                summary,
                encryptedPayload,
                active.token,
                active.device,
            );
        });
    });
    actions.append(
        text(
            'Opening will ask Share Capsules to check your account, this registered device, the creator’s limits, and this Capsule’s policy. A successful key release counts as an opening.',
        ),
        remember.label,
        approve,
    );
}

function viewerRuntime(): {
    readonly credentials: ViewerCredentialStore;
    readonly connector: ViewerAccountConnector;
    readonly consents: ViewerDisclosureConsentStore;
    readonly authorization: ViewerCtxAuthorizationClient;
    readonly redemption: ViewerBrokerRedemptionClient;
    readonly renderer: ViewerPayloadRenderer;
} {
    const deviceKeys = new IndexedDbViewerDeviceKeyStore();
    const credentials = new ViewerCredentialStore(chrome.storage.local, deviceKeys);
    const oauth = new ExtensionOAuthClient(
        {
            issuer: CONTROL_PLANE,
            authorizationEndpoint: `${CONTROL_PLANE}/oauth/authorize`,
            tokenEndpoint: `${CONTROL_PLANE}/oauth/token`,
            clientId: OAUTH_CLIENT_ID,
            redirectUri: `https://${DEVELOPMENT_EXTENSION_ID}.chromiumapp.org/oauth/callback`,
            scopes: ['extension:connect'],
            deviceScopes: ['ctx:authorize'],
        },
        new ChromeIdentityFlow(),
        new FetchOAuthTokenTransport(),
    );

    return {
        credentials,
        connector: new ViewerAccountConnector(
            oauth,
            new ViewerDeviceRegistrar(
                new FetchViewerDeviceRegistrationTransport(CONTROL_PLANE),
                deviceKeys,
            ),
            deviceKeys,
            credentials,
        ),
        consents: new ViewerDisclosureConsentStore(chrome.storage.local),
        authorization: new ViewerCtxAuthorizationClient(`${CONTROL_PLANE}/ctx/authorize`),
        redemption: new ViewerBrokerRedemptionClient(),
        renderer: new ViewerPayloadRenderer(),
    };
}

async function authorizeVerifiedCapsule(
    status: HTMLElement,
    runtime: ReturnType<typeof viewerRuntime>,
    summary: VerifiedViewerCapsuleSummary,
    encryptedPayload: Uint8Array,
    token: OAuthTokenSet,
    device: StoredViewerDeviceKeys,
): Promise<void> {
    const releaseOpenSlot = await acquireViewerOpenSlot(status, summary);
    try {
        await authorizeAndOpenVerifiedCapsule(
            status,
            runtime,
            summary,
            encryptedPayload,
            token,
            device,
        );
    } finally {
        await releaseOpenSlot();
    }
}

async function authorizeAndOpenVerifiedCapsule(
    status: HTMLElement,
    runtime: ReturnType<typeof viewerRuntime>,
    summary: VerifiedViewerCapsuleSummary,
    encryptedPayload: Uint8Array,
    token: OAuthTokenSet,
    device: StoredViewerDeviceKeys,
): Promise<void> {
    status.textContent = `Requesting authorization for “${summary.title ?? 'Capsule'}”.`;
    const authorization = await runtime.authorization.authorize(summary, token, device, true);
    if (!authorization.ok) {
        debugLog('authorization_failed', { code: authorization.code, ...debugSummary(summary) });
        status.textContent =
            'Authorization was not approved. The protected content remains locked.';
        postViewerState('error', {
            ...metadataFromSummary(summary),
            errorMessage: 'Authorization was not approved.',
        });
        return;
    }
    debugLog('authorization_approved', debugSummary(summary));

    status.textContent = `Authorization approved for “${summary.title ?? 'Capsule'}”. Requesting the key from the broker.`;
    const redemption = await runtime.redemption.redeem(
        summary,
        authorization.authorization.ticket,
        device,
    );
    if (!redemption.ok) {
        debugLog('redemption_failed', {
            code: redemption.code,
            denialCode: redemption.denialCode,
            retryable: redemption.retryable,
            ...debugSummary(summary),
        });
        status.textContent = brokerRedemptionFailureMessage(redemption);
        postViewerState('error', {
            ...metadataFromSummary(summary),
            errorMessage: brokerRedemptionFailureMessage(redemption),
        });
        return;
    }
    debugLog('key_released', debugSummary(summary));

    status.textContent = `Key released for “${summary.title ?? 'Capsule'}”. Opening locally inside the extension.`;
    const rendered = await runtime.renderer.render(
        summary,
        encryptedPayload,
        redemption.contentKey,
    );
    if (!rendered.ok) {
        debugLog('render_failed', { code: rendered.code, ...debugSummary(summary) });
        status.textContent =
            'This Capsule could not be decrypted and displayed safely. The protected content remains locked.';
        postViewerState('error', {
            ...metadataFromSummary(summary),
            errorMessage: 'This Capsule could not be decrypted and displayed safely.',
        });
        return;
    }

    showRenderedPayload(runtime.renderer, rendered);
    if (headingElement instanceof HTMLElement) headingElement.textContent = 'Capsule opened';
    if (shellElement instanceof HTMLElement) shellElement.classList.add('is-open');
    status.textContent = `Opened “${summary.title ?? 'Capsule'}” locally inside the Share Capsules Viewer.`;
    postViewerState('opened', metadataFromSummary(summary));
    debugLog('opened', {
        ...debugSummary(summary),
        mediaType: rendered.mediaType,
        plaintextBytes: summary.payloadPlaintextBytes,
    });
}

function postViewerState(
    state: 'action_required' | 'opened' | 'error',
    metadata: Parameters<typeof viewerStateMessage>[2] = {},
): void {
    if (capsuleUrl === null || siteOrigin === null) return;
    window.parent.postMessage(viewerStateMessage(capsuleUrl, state, metadata), siteOrigin);
}

function metadataFromSummary(
    summary: VerifiedViewerCapsuleSummary,
): Parameters<typeof viewerStateMessage>[2] {
    return {
        title: summary.title,
        description: summary.description,
    };
}

async function acquireViewerOpenSlot(
    status: HTMLElement,
    summary: VerifiedViewerCapsuleSummary,
): Promise<() => Promise<void>> {
    const requestId = `viewer-open-${crypto.randomUUID().replaceAll('-', '')}`;
    status.textContent = `Waiting to open “${summary.title ?? 'Capsule'}” safely.`;
    const response = await chrome.runtime.sendMessage(viewerOpenSlotAcquireMessage(requestId));
    if (!isViewerOpenSlotAcquireResponse(response)) {
        throw new Error('The Viewer opening queue did not grant a slot.');
    }
    debugLog('open_slot_acquired', debugSummary(summary));
    let released = false;
    const release = async (): Promise<void> => {
        if (released) return;
        released = true;
        if (activeOpenSlotRelease === release) activeOpenSlotRelease = undefined;
        await chrome.runtime.sendMessage(viewerOpenSlotReleaseMessage(requestId));
        debugLog('open_slot_released', debugSummary(summary));
    };
    activeOpenSlotRelease = release;

    return release;
}

function isViewerOpenSlotAcquireResponse(value: unknown): value is ViewerOpenSlotAcquireResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        (value as Record<string, unknown>).granted === true
    );
}

class ChromeIdentityFlow implements ExtensionIdentityFlow {
    public async launchWebAuthFlow(authorizationUrl: string): Promise<string> {
        const callback = await chrome.identity.launchWebAuthFlow({
            url: authorizationUrl,
            interactive: true,
        });
        if (callback === undefined) throw new Error('The authorization flow was cancelled.');
        return callback;
    }
}

function button(label: string): HTMLButtonElement {
    const element = document.createElement('button');
    element.type = 'button';
    element.textContent = label;
    return element;
}

function text(value: string): HTMLParagraphElement {
    const element = document.createElement('p');
    element.textContent = value;
    return element;
}

function checkbox(labelText: string): {
    readonly label: HTMLLabelElement;
    readonly input: HTMLInputElement;
} {
    const input = document.createElement('input');
    input.type = 'checkbox';
    const label = document.createElement('label');
    label.append(input, document.createTextNode(labelText));
    return { label, input };
}

async function withDisabledButton(
    buttonElement: HTMLButtonElement,
    action: () => Promise<void>,
): Promise<void> {
    buttonElement.disabled = true;
    try {
        await action();
    } catch {
        if (statusElement instanceof HTMLElement) {
            statusElement.textContent =
                'That step could not be completed. Nothing has been opened.';
        }
    } finally {
        buttonElement.disabled = false;
    }
}

export {};

function showRenderedPayload(
    renderer: ViewerPayloadRenderer,
    rendered: ViewerPayloadRenderResult,
): void {
    if (!(renderElement instanceof HTMLElement) || !rendered.ok) return;
    if (activeRenderedPayload !== undefined) renderer.dispose(activeRenderedPayload);
    activeRenderedPayload = rendered;

    const image = document.createElement('img');
    image.src = rendered.objectUrl;
    image.alt = rendered.altText;
    renderElement.replaceChildren(image);
    renderElement.classList.add('is-visible');
}

function waitForSharedViewerCredential(action: () => Promise<void>): void {
    stopWaitingForViewerCredentials?.();
    const listener = (
        changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>,
        areaName: string,
    ): void => {
        if (
            areaName !== 'local' ||
            !VIEWER_CREDENTIAL_STORAGE_KEYS.some((key) => Object.hasOwn(changes, key))
        ) {
            return;
        }
        stopWaitingForViewerCredentials?.();
        void resumeAfterSharedConnection(action);
    };
    chrome.storage.onChanged.addListener(listener);
    stopWaitingForViewerCredentials = () => {
        chrome.storage.onChanged.removeListener(listener);
        stopWaitingForViewerCredentials = undefined;
    };
}

async function resumeAfterSharedConnection(action: () => Promise<void>): Promise<void> {
    if (resumeAfterConnectionRunning) return;
    resumeAfterConnectionRunning = true;
    try {
        await action();
    } finally {
        resumeAfterConnectionRunning = false;
    }
}

function debugLog(event: string, details: Record<string, unknown> = {}): void {
    if (!debugEnabled) return;
    console.info('[Share Capsules Viewer]', event, details);
}

function brokerRedemptionFailureMessage(
    redemption: Extract<ViewerBrokerRedemptionResult, { readonly ok: false }>,
): string {
    if (redemption.code === 'rate_limited') {
        return 'Opening is temporarily limited because too many Capsules were requested at once. Wait a moment, then try again.';
    }
    if (redemption.code === 'invalid_ticket' || redemption.denialCode === 'invalid_ticket') {
        return 'This opening request could not be verified. Refresh the page and try again.';
    }
    if (redemption.denialCode === 'invalid_proof') {
        return 'This viewer session could not be verified. Reconnect your Share Capsules account and try again.';
    }
    if (redemption.denialCode === 'ticket_expired' || redemption.denialCode === 'ticket_replayed') {
        return 'This opening request is no longer fresh. Refresh the page and try again.';
    }
    if (redemption.denialCode === 'release_unavailable') {
        return 'This Capsule is no longer available to open.';
    }
    if (redemption.denialCode === 'capsule_limit_reached') {
        return 'This Capsule has reached its total opening limit.';
    }
    if (redemption.denialCode === 'account_capsule_limit_reached') {
        return 'Your account has reached its opening limit for this Capsule.';
    }
    if (redemption.denialCode === 'account_unavailable') {
        return 'Your Share Capsules account is not currently allowed to open this Capsule.';
    }
    if (redemption.denialCode === 'device_registration_required') {
        return 'This browser is not registered for viewing. Reconnect your Share Capsules account and try again.';
    }
    if (redemption.denialCode === 'policy_unsatisfied') {
        return 'This Capsule cannot be opened right now because its access rules are not satisfied.';
    }
    if (redemption.denialCode === 'automation_risk_high') {
        return 'This Capsule cannot be opened because automated viewing protection was triggered.';
    }
    if (redemption.retryable || redemption.denialCode === 'temporarily_unavailable') {
        return 'The key service is temporarily unavailable. Wait a moment, then try again.';
    }

    return 'This Capsule could not be opened safely. The protected content remains locked.';
}

function debugSummary(summary: VerifiedViewerCapsuleSummary): Record<string, unknown> {
    return {
        capsule: `${shortIdentifier(summary.capsuleId)}#${summary.capsuleRevision}`,
        profile: `${summary.contentProfileId}@${summary.contentProfileVersion}`,
        mediaType: summary.mediaType,
        payloadId: summary.payloadId,
        ciphertextBytes: summary.ciphertextBytes,
        plaintextBytes: summary.payloadPlaintextBytes,
        brokerOrigin: safeOrigin(summary.broker),
        ctxOrigin: safeOrigin(summary.ctxIssuer),
    };
}

function safeOrigin(value: string): string {
    try {
        return new URL(value).origin;
    } catch {
        return 'invalid-url';
    }
}

function shortIdentifier(value: string): string {
    return value.length <= 16 ? value : `…${value.slice(-12)}`;
}

globalThis.addEventListener('pagehide', () => {
    stopWaitingForViewerCredentials?.();
    void activeOpenSlotRelease?.();
    if (activeRenderedPayload !== undefined) {
        new ViewerPayloadRenderer().dispose(activeRenderedPayload);
        activeRenderedPayload = undefined;
    }
});
