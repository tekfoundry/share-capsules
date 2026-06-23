import { describe, expect, it } from 'vitest';

import {
    CreatorDraftValidationError,
    buildCreatorHandoffDetail,
    buildCreatorDraft,
    calendarDateBoundary,
} from './creator-studio.js';

const validInput = (overrides = {}) => ({
    title: '  Protected landscape  ',
    description: '  An evening study.  ',
    notBefore: '',
    notAfter: '',
    globalLimit: '',
    accountLimit: '',
    automationRiskRequired: false,
    ...overrides,
});

describe('Creator Studio draft handoff', () => {
    it('builds a closed versioned draft without content or key fields', () => {
        expect(buildCreatorDraft(validInput())).toEqual({
            version: 1,
            description: {
                title: 'Protected landscape',
                description: 'An evening study.',
            },
            fallback: { alt_text: 'An evening study.' },
            policy: { automation_risk_required: false },
        });
    });

    it('wraps the public draft with a local-only account label for the extension', () => {
        const detail = JSON.parse(
            buildCreatorHandoffDetail(buildCreatorDraft(validInput()), 'creator@example.com'),
        );

        expect(detail.accountLabel).toBe('creator@example.com');
        expect(JSON.parse(detail.draft)).toMatchObject({
            version: 1,
            description: { title: 'Protected landscape' },
        });
    });

    it('includes only configured optional policy gates', () => {
        expect(
            buildCreatorDraft(
                validInput({
                    globalLimit: '25',
                    accountLimit: '3',
                    automationRiskRequired: true,
                }),
            ).policy,
        ).toEqual({
            capsule_lifetime_maximum: 25,
            account_capsule_lifetime_maximum: 3,
            automation_risk_required: true,
        });
    });

    it('includes either or both exact access-window boundaries', () => {
        expect(
            buildCreatorDraft(
                validInput({
                    notBefore: '2026-07-01T05:00:00Z',
                    notAfter: '2026-08-01T05:00:00Z',
                }),
            ).policy.access_window,
        ).toEqual({
            not_before: '2026-07-01T05:00:00Z',
            not_after: '2026-08-01T05:00:00Z',
        });
        expect(
            buildCreatorDraft(validInput({ notAfter: '2026-08-01T05:00:00Z' })).policy
                .access_window,
        ).toEqual({ not_after: '2026-08-01T05:00:00Z' });
    });

    it('rejects reversed access-window boundaries', () => {
        expect(() =>
            buildCreatorDraft(
                validInput({
                    notBefore: '2026-08-01T05:00:00Z',
                    notAfter: '2026-07-01T05:00:00Z',
                }),
            ),
        ).toThrow(CreatorDraftValidationError);
    });

    it('maps the closing date to the following local midnight', () => {
        expect(calendarDateBoundary('2026-07-10', true)).toBe(
            new Date(2026, 6, 11).toISOString().replace('.000Z', 'Z'),
        );
        expect(calendarDateBoundary('2026-07-10', false)).toBe(
            new Date(2026, 6, 10).toISOString().replace('.000Z', 'Z'),
        );
        expect(() => calendarDateBoundary('2026-02-30', false)).toThrow(
            CreatorDraftValidationError,
        );
    });

    it.each(['0', '-1', '1.5', '9007199254740992'])(
        'rejects the invalid configured limit %s',
        (globalLimit) => {
            expect(() => buildCreatorDraft(validInput({ globalLimit }))).toThrow(
                CreatorDraftValidationError,
            );
        },
    );

    it('accepts either limit independently and rejects a total below the per-account limit', () => {
        expect(buildCreatorDraft(validInput({ globalLimit: '5' })).policy).toMatchObject({
            capsule_lifetime_maximum: 5,
        });
        expect(buildCreatorDraft(validInput({ accountLimit: '3' })).policy).toMatchObject({
            account_capsule_lifetime_maximum: 3,
        });
        expect(() =>
            buildCreatorDraft(validInput({ globalLimit: '2', accountLimit: '3' })),
        ).toThrow(CreatorDraftValidationError);
        expect(
            buildCreatorDraft(validInput({ globalLimit: '3', accountLimit: '3' })).policy,
        ).toMatchObject({
            capsule_lifetime_maximum: 3,
            account_capsule_lifetime_maximum: 3,
        });
    });

    it('requires a bounded title and uses it when the optional description is blank', () => {
        expect(() => buildCreatorDraft(validInput({ title: '' }))).toThrow(
            CreatorDraftValidationError,
        );
        expect(buildCreatorDraft(validInput({ description: '' })).fallback).toEqual({
            alt_text: 'Protected landscape',
        });
        expect(() => buildCreatorDraft(validInput({ description: 'x'.repeat(1001) }))).toThrow(
            CreatorDraftValidationError,
        );
    });
});
