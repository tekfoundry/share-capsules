import { describe, expect, it } from 'vitest';

import {
    CREATOR_DRAFT_MESSAGE,
    CREATOR_HANDOFF_MESSAGE,
    parseCreatorDraftMessage,
    parseCreatorHandoffMessage,
} from './extension-messages.js';

describe('extension runtime messages', () => {
    it('accepts the exact bounded Creator handoff and one-use draft request', () => {
        expect(
            parseCreatorHandoffMessage({
                type: CREATOR_HANDOFF_MESSAGE,
                draft: '{"version":1}',
                accountLabel: 'creator@example.com',
            }),
        ).toEqual({
            type: CREATOR_HANDOFF_MESSAGE,
            draft: '{"version":1}',
            accountLabel: 'creator@example.com',
        });
        expect(
            parseCreatorDraftMessage({
                type: CREATOR_DRAFT_MESSAGE,
                requestId: `draft_${'a'.repeat(32)}`,
            }),
        ).toEqual({ type: CREATOR_DRAFT_MESSAGE, requestId: `draft_${'a'.repeat(32)}` });
    });

    it.each([
        null,
        {
            type: CREATOR_HANDOFF_MESSAGE,
            draft: '{}',
            accountLabel: 'a@b.co',
            source: 'secret.png',
        },
        { type: CREATOR_HANDOFF_MESSAGE, draft: 'x'.repeat(16_385), accountLabel: 'a@b.co' },
        { type: CREATOR_HANDOFF_MESSAGE, draft: '{}', accountLabel: ' x@example.com' },
        { type: 'future-handoff', draft: '{}', accountLabel: 'a@b.co' },
    ])('rejects malformed or expanded handoff messages %#', (value) => {
        expect(() => parseCreatorHandoffMessage(value)).toThrow();
    });

    it.each([
        { type: CREATOR_DRAFT_MESSAGE, requestId: 'draft_short' },
        { type: CREATOR_DRAFT_MESSAGE, requestId: `draft_${'g'.repeat(32)}` },
        { type: CREATOR_DRAFT_MESSAGE, requestId: `draft_${'a'.repeat(32)}`, extra: true },
    ])('rejects malformed or expanded draft requests %#', (value) => {
        expect(() => parseCreatorDraftMessage(value)).toThrow();
    });
});
