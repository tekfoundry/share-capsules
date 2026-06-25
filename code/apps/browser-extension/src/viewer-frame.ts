import { fetchViewerCapsule } from './viewer-capsule-fetcher.js';
import type { ViewerCapsuleFetchResult } from './viewer-capsule-fetcher.js';
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
import { ViewerBrokerRedemptionClient } from './viewer-broker-redemption.js';
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
import { viewerFrameStateView, type ViewerFrameState } from './viewer-frame-state.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';
import {
    brokerRedemptionFailureIsRetryable,
    brokerRedemptionFailureMessage,
    viewerAuthorizationFailureIsRetryable,
    viewerAuthorizationFailureMessage,
    viewerFetchFailureIsRetryable,
    viewerFetchFailureMessage,
} from './viewer-blocker-state.js';
import { guardedViewerStorage } from './viewer-storage-policy.js';

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
    readonly permissions: {
        contains(permissions: { readonly origins: readonly string[] }): Promise<boolean>;
        request(permissions: { readonly origins: readonly string[] }): Promise<boolean>;
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
const shellElement = document.querySelector('[data-viewer-shell]');
const statusElement = document.querySelector('[data-viewer-status]');
const urlElement = document.querySelector('[data-viewer-capsule-url]');
const actionsElement = document.querySelector('[data-viewer-actions]');
const renderElement = document.querySelector('[data-viewer-render]');
const headingElement = document.querySelector('[data-viewer-heading]');
let activeRenderedPayload: ViewerPayloadRenderResult | undefined;
let stopWaitingForViewerCredentials: (() => void) | undefined;
let resumeAfterConnectionRunning = false;
let activeOpenSlotRelease: (() => Promise<void>) | undefined;
let activeOpenAttempt: Promise<void> | undefined;
let payloadOpened = false;

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
    actionsElement.replaceChildren();
    if (capsuleUrl === null || capsuleUrl.trim() === '') {
        setViewerFrameState('error', 'No Capsule URL was provided to this Viewer frame.');
        urlElement.textContent = '';
        return;
    }
    if (siteOrigin === null || siteOrigin.trim() === '') {
        setViewerFrameState('error', 'No Host site origin was provided to this Viewer frame.');
        urlElement.textContent = capsuleUrl;
        return;
    }

    debugLog('frame_initialized', { siteOrigin, capsuleOrigin: safeOrigin(capsuleUrl) });
    setViewerFrameState('loading', 'Fetching this Capsule safely before verification.');
    urlElement.textContent = capsuleUrl;

    const fetchResult = await fetchViewerCapsule(capsuleUrl, {
        hostPermissions: {
            contains: async (permission) => chrome.permissions.contains({ origins: [permission] }),
        },
    });
    if (!fetchResult.ok) {
        debugLog('fetch_failed', { code: fetchResult.code });
        if (fetchResult.code === 'missing_host_permission') {
            showCapsuleHostPermissionBlocker(fetchResult);
            return;
        }
        showBlocker(
            statusElement,
            actionsElement,
            viewerFetchFailureMessage(fetchResult.code),
            viewerFetchFailureIsRetryable(fetchResult.code),
            async () => {
                await initializeViewerFrame();
            },
        );
        return;
    }
    debugLog('fetched', {
        bytes: fetchResult.bytes.byteLength,
        capsuleOrigin: safeOrigin(fetchResult.url),
    });

    setViewerFrameState(
        'loading',
        `Capsule fetched safely (${formatBytes(fetchResult.bytes.byteLength)}). Verifying its signed package.`,
    );
    urlElement.textContent = fetchResult.url;

    const verificationResult = await verifyFetchedViewerCapsule(fetchResult.bytes);
    if (!verificationResult.ok) {
        debugLog('verification_failed', { code: verificationResult.code });
        setViewerFrameState(
            'error',
            'This Capsule could not be verified safely. The protected content remains locked.',
        );
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

function showCapsuleHostPermissionBlocker(
    result: Extract<ViewerCapsuleFetchResult, { readonly ok: false }>,
): void {
    if (result.code !== 'missing_host_permission' || result.permission === undefined) return;
    const permission = result.permission;
    if (!(actionsElement instanceof HTMLElement)) {
        setViewerFrameState(
            'error',
            'This Capsule host must be allowed before protected content can open.',
        );
        postViewerState('error', {
            errorMessage: 'This Capsule host must be allowed before protected content can open.',
        });
        return;
    }

    const hostLabel = result.origin ?? result.permission;
    const message = `Allow ${hostLabel} as a Capsule host before opening protected content from it.`;
    actionsElement.replaceChildren();
    setViewerFrameState('action_required', message);
    postViewerState('action_required', { errorMessage: message });

    const allow = button('Allow Capsule host');
    allow.addEventListener('click', () => {
        void withDisabledButton(allow, async () => {
            const granted = await chrome.permissions.request({
                origins: [permission],
            });
            if (granted) {
                actionsElement.replaceChildren();
                await initializeViewerFrame();
                return;
            }
            setViewerFrameState(
                'action_required',
                `Capsule host access was not granted for ${hostLabel}. The protected content remains locked.`,
            );
        });
    });
    actionsElement.append(allow);
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

function setViewerFrameState(state: ViewerFrameState, message: string): void {
    const view = viewerFrameStateView(state);
    if (shellElement instanceof HTMLElement) {
        shellElement.dataset.viewerState = state;
        shellElement.setAttribute('aria-busy', view.ariaBusy);
        shellElement.classList.toggle('is-open', view.className === 'is-open');
    }
    if (headingElement instanceof HTMLElement) headingElement.textContent = view.heading;
    if (statusElement instanceof HTMLElement) statusElement.textContent = message;
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
        setViewerFrameState(
            'action_required',
            `Verified “${summary.title ?? 'Capsule'}”. Connect your Share Capsules account to continue.`,
        );
        const connect = button('Connect account');
        connect.addEventListener('click', () => {
            void withDisabledButton(connect, async () => {
                setViewerFrameState(
                    'loading',
                    'Connecting your Share Capsules account and registered device.',
                );
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
    setViewerFrameState(
        'action_required',
        `Verified “${summary.title ?? 'Capsule'}”. Approve view-event accounting before authorization.`,
    );
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
    const viewerStorage = guardedViewerStorage(chrome.storage.local);
    const credentials = new ViewerCredentialStore(viewerStorage, deviceKeys);
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
        consents: new ViewerDisclosureConsentStore(viewerStorage),
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
    if (payloadOpened) return;
    if (activeOpenAttempt !== undefined) return activeOpenAttempt;

    activeOpenAttempt = authorizeVerifiedCapsuleOnce(
        status,
        runtime,
        summary,
        encryptedPayload,
        token,
        device,
    ).finally(() => {
        activeOpenAttempt = undefined;
    });

    return activeOpenAttempt;
}

async function authorizeVerifiedCapsuleOnce(
    status: HTMLElement,
    runtime: ReturnType<typeof viewerRuntime>,
    summary: VerifiedViewerCapsuleSummary,
    encryptedPayload: Uint8Array,
    token: OAuthTokenSet,
    device: StoredViewerDeviceKeys,
): Promise<void> {
    const releaseOpenSlot = await acquireViewerOpenSlot(status, summary);
    try {
        if (payloadOpened) return;
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
    setViewerFrameState('loading', `Requesting authorization for “${summary.title ?? 'Capsule'}”.`);
    const authorization = await runtime.authorization.authorize(summary, token, device, true);
    if (!authorization.ok) {
        debugLog('authorization_failed', { code: authorization.code, ...debugSummary(summary) });
        showBlocker(
            status,
            document.querySelector('[data-viewer-actions]'),
            viewerAuthorizationFailureMessage(authorization.code),
            viewerAuthorizationFailureIsRetryable(authorization.code),
            async () => {
                await authorizeVerifiedCapsule(
                    status,
                    runtime,
                    summary,
                    encryptedPayload,
                    token,
                    device,
                );
            },
            metadataFromSummary(summary),
        );
        return;
    }
    debugLog('authorization_approved', debugSummary(summary));

    setViewerFrameState(
        'loading',
        `Authorization approved for “${summary.title ?? 'Capsule'}”. Requesting the key from the broker.`,
    );
    const redemption = await runtime.redemption.redeem(
        summary,
        authorization.authorization.ticket,
        device,
    );
    if (!redemption.ok) {
        const message = brokerRedemptionFailureMessage(redemption, summary.policy);
        debugLog('redemption_failed', {
            code: redemption.code,
            denialCode: redemption.denialCode,
            retryable: redemption.retryable,
            ...debugSummary(summary),
        });
        showBlocker(
            status,
            document.querySelector('[data-viewer-actions]'),
            message,
            brokerRedemptionFailureIsRetryable(redemption),
            async () => {
                await authorizeVerifiedCapsule(
                    status,
                    runtime,
                    summary,
                    encryptedPayload,
                    token,
                    device,
                );
            },
            metadataFromSummary(summary),
        );
        return;
    }
    debugLog('key_released', debugSummary(summary));

    setViewerFrameState(
        'loading',
        `Key released for “${summary.title ?? 'Capsule'}”. Opening locally inside the extension.`,
    );
    const rendered = await runtime.renderer.render(
        summary,
        encryptedPayload,
        redemption.contentKey,
    );
    if (!rendered.ok) {
        debugLog('render_failed', { code: rendered.code, ...debugSummary(summary) });
        setViewerFrameState(
            'error',
            'This Capsule could not be decrypted and displayed safely. The protected content remains locked.',
        );
        postViewerState('error', {
            ...metadataFromSummary(summary),
            errorMessage: 'This Capsule could not be decrypted and displayed safely.',
        });
        return;
    }

    showRenderedPayload(runtime.renderer, rendered);
    payloadOpened = true;
    setViewerFrameState(
        'opened',
        `Opened “${summary.title ?? 'Capsule'}” locally inside the Share Capsules Viewer.`,
    );
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

function showBlocker(
    status: HTMLElement,
    actions: Element | null,
    message: string,
    retryable: boolean,
    retry: () => Promise<void>,
    metadata: Parameters<typeof viewerStateMessage>[2] = {},
): void {
    void status;
    if (!(actions instanceof HTMLElement)) {
        setViewerFrameState('error', message);
        postViewerState('error', { ...metadata, errorMessage: message });
        return;
    }
    actions.replaceChildren();
    if (!retryable) {
        setViewerFrameState('error', message);
        postViewerState('error', { ...metadata, errorMessage: message });
        return;
    }

    setViewerFrameState('action_required', message);
    postViewerState('action_required', { ...metadata, errorMessage: message });
    const retryButton = button('Try again');
    retryButton.addEventListener('click', () => {
        void withDisabledButton(retryButton, async () => {
            actions.replaceChildren();
            await retry();
        });
    });
    actions.append(retryButton);
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
    void status;
    setViewerFrameState('loading', `Waiting to open “${summary.title ?? 'Capsule'}” safely.`);
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
        setViewerFrameState(
            'action_required',
            'That step could not be completed. Nothing has been opened.',
        );
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
