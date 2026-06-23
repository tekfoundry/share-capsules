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
