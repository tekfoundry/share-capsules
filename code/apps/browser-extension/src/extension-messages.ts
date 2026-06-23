export const CREATOR_HANDOFF_MESSAGE = 'creator-handoff-v1' as const;
export const CREATOR_DRAFT_MESSAGE = 'creator-draft-v1' as const;

export interface CreatorHandoffMessageV1 {
    readonly type: typeof CREATOR_HANDOFF_MESSAGE;
    readonly draft: string;
    readonly accountLabel: string;
}

export interface CreatorDraftMessageV1 {
    readonly type: typeof CREATOR_DRAFT_MESSAGE;
    readonly requestId: string;
}

export function parseCreatorHandoffMessage(value: unknown): CreatorHandoffMessageV1 {
    const record = exactRecord(value, ['accountLabel', 'draft', 'type']);
    if (
        record.type !== CREATOR_HANDOFF_MESSAGE ||
        typeof record.draft !== 'string' ||
        record.draft.length < 2 ||
        record.draft.length > 16_384 ||
        typeof record.accountLabel !== 'string' ||
        record.accountLabel.trim() !== record.accountLabel ||
        record.accountLabel.length < 3 ||
        record.accountLabel.length > 320
    ) {
        throw new Error('Invalid Creator handoff message.');
    }
    return {
        type: CREATOR_HANDOFF_MESSAGE,
        draft: record.draft,
        accountLabel: record.accountLabel,
    };
}

export function parseCreatorDraftMessage(value: unknown): CreatorDraftMessageV1 {
    const record = exactRecord(value, ['requestId', 'type']);
    if (
        record.type !== CREATOR_DRAFT_MESSAGE ||
        typeof record.requestId !== 'string' ||
        !/^draft_[a-f0-9]{32}$/u.test(record.requestId)
    ) {
        throw new Error('Invalid Creator draft request.');
    }
    return { type: CREATOR_DRAFT_MESSAGE, requestId: record.requestId };
}

function exactRecord(value: unknown, expected: readonly string[]): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Invalid extension message.');
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) {
        throw new Error('Invalid extension message.');
    }
    return record;
}
