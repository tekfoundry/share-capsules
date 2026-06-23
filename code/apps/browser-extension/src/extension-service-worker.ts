import {
    CREATOR_DRAFT_MESSAGE,
    parseCreatorDraftMessage,
    parseCreatorHandoffMessage,
} from './extension-messages.js';

interface MessageSender {
    readonly url?: string;
    readonly tab?: { readonly id?: number };
}

declare const chrome: {
    readonly runtime: {
        getURL(path: string): string;
        readonly onInstalled: {
            addListener(listener: () => void): void;
        };
        readonly onStartup: {
            addListener(listener: () => void): void;
        };
        readonly onMessage: {
            addListener(
                listener: (
                    message: unknown,
                    sender: MessageSender,
                    respond: (response?: unknown) => void,
                ) => boolean | void,
            ): void;
        };
    };
    readonly scripting: {
        getRegisteredContentScripts(filter?: {
            readonly ids?: readonly string[];
        }): Promise<readonly { readonly id: string }[]>;
        registerContentScripts(
            scripts: readonly {
                readonly id: string;
                readonly matches: readonly string[];
                readonly js: readonly string[];
                readonly runAt: 'document_idle';
                readonly allFrames: boolean;
                readonly persistAcrossSessions: boolean;
            }[],
        ): Promise<void>;
        updateContentScripts(
            scripts: readonly {
                readonly id: string;
                readonly matches: readonly string[];
                readonly js: readonly string[];
                readonly runAt: 'document_idle';
                readonly allFrames: boolean;
                readonly persistAcrossSessions: boolean;
            }[],
        ): Promise<void>;
    };
    readonly storage: {
        readonly session: {
            get(key: string): Promise<Record<string, unknown>>;
            remove(key: string): Promise<void>;
            set(items: Record<string, unknown>): Promise<void>;
        };
    };
    readonly tabs: {
        create(properties: { readonly url: string }): Promise<unknown>;
    };
};

const VIEWER_DISCOVERY_SCRIPT = Object.freeze({
    id: 'share-capsules-viewer-discovery',
    matches: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
    js: ['viewer-discovery.js'],
    runAt: 'document_idle' as const,
    allFrames: false,
    persistAcrossSessions: true,
});

void ensureViewerDiscoveryContentScript();
chrome.runtime.onInstalled.addListener(() => void ensureViewerDiscoveryContentScript());
chrome.runtime.onStartup.addListener(() => void ensureViewerDiscoveryContentScript());

chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (isCreatorPage(sender.url)) {
        void acceptHandoff(message)
            .then(respond)
            .catch(() => respond({ accepted: false }));
        return true;
    }
    if (isCreatorExtensionPage(sender.url)) {
        void takeDraft(message)
            .then(respond)
            .catch(() => respond(undefined));
        return true;
    }
});

async function ensureViewerDiscoveryContentScript(): Promise<void> {
    try {
        const registered = await chrome.scripting.getRegisteredContentScripts({
            ids: [VIEWER_DISCOVERY_SCRIPT.id],
        });
        if (registered.length === 0) {
            await chrome.scripting.registerContentScripts([VIEWER_DISCOVERY_SCRIPT]);
            return;
        }
        await chrome.scripting.updateContentScripts([VIEWER_DISCOVERY_SCRIPT]);
    } catch {
        // Discovery is best-effort until the viewer grants a compatible Host permission.
        // The creator flow and installed extension must continue to work without it.
    }
}

async function acceptHandoff(value: unknown): Promise<{ readonly accepted: true }> {
    const message = parseCreatorHandoffMessage(value);
    const requestId = `draft_${crypto.randomUUID().replaceAll('-', '')}`;
    await chrome.storage.session.set({
        [requestId]: {
            draft: message.draft,
            accountLabel: message.accountLabel,
        },
    });
    await chrome.tabs.create({
        url: `${chrome.runtime.getURL('creator-studio.html')}?request=${requestId}`,
    });
    return { accepted: true };
}

function isCreatorExtensionPage(value: string | undefined): boolean {
    if (value === undefined) return false;
    try {
        const actual = new URL(value);
        const expected = new URL(chrome.runtime.getURL('creator-studio.html'));
        return (
            actual.origin === expected.origin &&
            actual.pathname === expected.pathname &&
            actual.hash === ''
        );
    } catch {
        return false;
    }
}

async function takeDraft(value: unknown): Promise<unknown> {
    const message = parseCreatorDraftMessage(value);
    const stored = await chrome.storage.session.get(message.requestId);
    const draft = stored[message.requestId];
    await chrome.storage.session.remove(message.requestId);
    return isStoredDraft(draft)
        ? { type: CREATOR_DRAFT_MESSAGE, draft: draft.draft, accountLabel: draft.accountLabel }
        : undefined;
}

function isStoredDraft(
    value: unknown,
): value is { readonly draft: string; readonly accountLabel: string } {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof (value as Record<string, unknown>).draft === 'string' &&
        typeof (value as Record<string, unknown>).accountLabel === 'string'
    );
}

function isCreatorPage(value: string | undefined): boolean {
    if (value === undefined) return false;
    try {
        const url = new URL(value);
        return (
            url.origin === 'http://localhost:3003' &&
            url.pathname === '/studio/capsules/create' &&
            url.search === '' &&
            url.hash === ''
        );
    } catch {
        return false;
    }
}
