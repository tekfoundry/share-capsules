import { CREATOR_HANDOFF_MESSAGE, parseCreatorHandoffMessage } from './extension-messages.js';

declare const chrome: {
    readonly runtime: {
        sendMessage(message: unknown): Promise<unknown>;
    };
};

const HANDOFF_EVENT = 'sharecapsules:creator-handoff-v1';
const ACCEPTED_EVENT = 'sharecapsules:creator-handoff-accepted-v1';
const FAILED_EVENT = 'sharecapsules:creator-handoff-failed-v1';

document.addEventListener(HANDOFF_EVENT, (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const detail = parseHandoffDetail(event.detail);
    if (detail === undefined) return;
    let message;
    try {
        message = parseCreatorHandoffMessage({
            type: CREATOR_HANDOFF_MESSAGE,
            draft: detail.draft,
            accountLabel: detail.accountLabel,
        });
    } catch {
        return;
    }
    if (typeof chrome === 'undefined' || chrome.runtime === undefined) {
        document.dispatchEvent(new CustomEvent(FAILED_EVENT));
        return;
    }
    void chrome.runtime
        .sendMessage(message)
        .then((response) => {
            if (isAcceptedResponse(response)) {
                document.dispatchEvent(new CustomEvent(ACCEPTED_EVENT));
                return;
            }
            document.dispatchEvent(new CustomEvent(FAILED_EVENT));
        })
        .catch(() => document.dispatchEvent(new CustomEvent(FAILED_EVENT)));
});

function parseHandoffDetail(
    value: unknown,
): { readonly draft: string; readonly accountLabel: string } | undefined {
    const parsed = typeof value === 'string' ? parseJson(value) : value;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).sort().join(',') !== 'accountLabel,draft') return undefined;
    if (typeof record.draft !== 'string' || typeof record.accountLabel !== 'string') {
        return undefined;
    }
    return { draft: record.draft, accountLabel: record.accountLabel };
}

function parseJson(value: string): unknown {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
}

function isAcceptedResponse(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.keys(value).length === 1 &&
        (value as Record<string, unknown>).accepted === true
    );
}
