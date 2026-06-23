import { CreatorBrokerRegistrationClient } from './creator-broker-registration.js';
import { CreatorAccountConnector, CreatorCredentialStore } from './creator-account-connection.js';
import { CreatorCapsuleBuilderV1 } from './creator-capsule-builder.js';
import { CreatorCapsuleWorkflow } from './creator-capsule-workflow.js';
import { mountCreatorStudioPage } from './creator-studio-page.js';
import {
    ExtensionOAuthClient,
    FetchOAuthTokenTransport,
    type ExtensionIdentityFlow,
} from './oauth.js';
import {
    FetchViewerDeviceRegistrationTransport,
    IndexedDbViewerDeviceKeyStore,
    ViewerDeviceRegistrar,
} from './viewer-device.js';
import { CREATOR_DRAFT_MESSAGE } from './extension-messages.js';
import {
    FileSystemCreatorWorkspace,
    IndexedDbCreatorWorkspaceSelectionStore,
    CreatorWorkspaceRecoveryStore,
    type CreatorWorkspaceDirectoryHandle,
} from './creator-workspace.js';

declare const chrome: {
    readonly runtime: {
        sendMessage(message: unknown): Promise<unknown>;
    };
    readonly storage: {
        readonly local: {
            get(keys: readonly string[]): Promise<Record<string, unknown>>;
            set(items: Record<string, unknown>): Promise<void>;
        };
    };
    readonly identity: {
        launchWebAuthFlow(details: {
            readonly url: string;
            readonly interactive: boolean;
        }): Promise<string | undefined>;
    };
};

interface CreatorWorkspacePickerWindow extends Window {
    showDirectoryPicker?: (options: {
        readonly mode: 'readwrite';
    }) => Promise<CreatorWorkspaceDirectoryHandle>;
}

const CONTROL_PLANE = 'http://localhost:3003';
const BROKER = 'http://localhost:3004';
const DEVELOPMENT_EXTENSION_ID = 'dhconceamghcnndjodjhjikknblhkmej';
const OAUTH_CLIENT_ID = '01977ac8-793e-72d4-a234-bd581e773e7e';

void start();

async function start(): Promise<void> {
    const root = document.querySelector('[data-creator-studio]');
    if (!(root instanceof HTMLElement)) return;
    try {
        const requestId = new URL(location.href).searchParams.get('request');
        if (requestId === null || !/^draft_[a-f0-9]{32}$/u.test(requestId)) {
            throw new Error('Missing draft request.');
        }
        const response = await chrome.runtime.sendMessage({
            type: CREATOR_DRAFT_MESSAGE,
            requestId,
        });
        const request = parseDraftResponse(response);
        const registration = new CreatorBrokerRegistrationClient({
            grantEndpoint: `${CONTROL_PLANE}/api/broker-registration-grants`,
            broker: BROKER,
            lifecycleBaseEndpoint: `${CONTROL_PLANE}/api/capsule-registrations`,
        });
        const deviceKeys = new IndexedDbViewerDeviceKeyStore();
        const credentials = new CreatorCredentialStore(chrome.storage.local, deviceKeys);
        const oauth = new ExtensionOAuthClient(
            {
                issuer: CONTROL_PLANE,
                authorizationEndpoint: `${CONTROL_PLANE}/oauth/authorize`,
                tokenEndpoint: `${CONTROL_PLANE}/oauth/token`,
                clientId: OAUTH_CLIENT_ID,
                redirectUri: `https://${DEVELOPMENT_EXTENSION_ID}.chromiumapp.org/oauth/callback`,
                scopes: ['extension:connect'],
                deviceScopes: ['ctx:authorize', 'capsule:create'],
            },
            new ChromeIdentityFlow(),
            new FetchOAuthTokenTransport(),
        );
        const connector = new CreatorAccountConnector(
            oauth,
            new ViewerDeviceRegistrar(
                new FetchViewerDeviceRegistrationTransport(CONTROL_PLANE),
                deviceKeys,
            ),
            deviceKeys,
            credentials,
        );
        const workspace = new FileSystemCreatorWorkspace(
            new CreatorWorkspaceRecoveryStore(chrome.storage.local),
            new IndexedDbCreatorWorkspaceSelectionStore(),
        );
        mountCreatorStudioPage(root, request.draft, {
            accountLabel: request.accountLabel,
            connectAccount: () => connector.ensureConnected('Creator extension'),
            isAccountConnected: async () => (await credentials.active()) !== undefined,
            createWorkflow: (surface, keyRing) =>
                new CreatorCapsuleWorkflow(
                    surface,
                    keyRing,
                    credentials,
                    new CreatorCapsuleBuilderV1(
                        {
                            ctxIssuer: CONTROL_PLANE,
                            automationRiskIssuer: CONTROL_PLANE,
                        },
                        registration,
                    ),
                    registration,
                    workspace,
                    surface.draftValue().description.title,
                ),
            workspaceRecoveryWriter: workspace,
            instructionsBaseUrl: `${CONTROL_PLANE}/instructions`,
            workspaceSelector: {
                status: (keyId, preferredWorkspaceName) =>
                    workspace.status(keyId, preferredWorkspaceName),
                choose: async (keyId, workspaceName) => {
                    const picker = (window as CreatorWorkspacePickerWindow).showDirectoryPicker;
                    if (picker === undefined) {
                        throw new Error('Directory selection is unavailable in this browser.');
                    }
                    const parent = await picker.call(window, { mode: 'readwrite' });
                    return workspace.select(keyId, workspaceName, parent);
                },
            },
        });
    } catch {
        root.replaceChildren(
            message('This Creator request is unavailable or has already been used.'),
        );
    }
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

function parseDraftResponse(value: unknown): {
    readonly draft: string;
    readonly accountLabel: string;
} {
    if (
        typeof value !== 'object' ||
        value === null ||
        Array.isArray(value) ||
        Object.keys(value).sort().join(',') !== 'accountLabel,draft,type'
    ) {
        throw new Error('Invalid draft response.');
    }
    const record = value as Record<string, unknown>;
    if (
        record.type !== CREATOR_DRAFT_MESSAGE ||
        typeof record.draft !== 'string' ||
        record.draft.length > 16_384 ||
        typeof record.accountLabel !== 'string' ||
        record.accountLabel.length < 3 ||
        record.accountLabel.length > 320
    ) {
        throw new Error('Invalid draft response.');
    }
    return { draft: record.draft, accountLabel: record.accountLabel };
}

function message(text: string): HTMLElement {
    const paragraph = document.createElement('p');
    paragraph.setAttribute('role', 'alert');
    paragraph.textContent = text;
    return paragraph;
}
