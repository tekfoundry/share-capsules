import { CTX_ERROR_CODES, type CtxErrorCodeV1, type CtxErrorV1 } from '@sharecapsules/ctx-client';
import { describe, expect, it } from 'vitest';

import {
    hostLifecycleState,
    viewerDenialFromResponse,
    type ViewerDenialPresentation,
} from './ctx-denial.js';

function error(code: CtxErrorCodeV1, retryable = false): CtxErrorV1 {
    return { type: 'ctx-error', version: 1, code, retryable };
}

describe('privacy-safe CTX denial presentation', () => {
    it('maps every closed-world protocol code to reviewed Viewer language', () => {
        for (const code of CTX_ERROR_CODES) {
            const denial = viewerDenialFromResponse(error(code));

            expect(denial.protocolCode).toBe(code);
            expect(denial.title.length).toBeGreaterThan(0);
            expect(denial.explanation.length).toBeGreaterThan(0);
            expect(denial.explanation).not.toMatch(
                /account[_ -]?id|score|threshold|history|device[_ -]?id/iu,
            );
        }
    });

    it('gives useful actions without exposing risk counts or a personhood claim', () => {
        expect(viewerDenialFromResponse(error('email_verification_required'))).toMatchObject({
            category: 'account',
            action: 'verify_email',
        });
        expect(viewerDenialFromResponse(error('consent_required'))).toMatchObject({
            category: 'consent',
            action: 'review_consent',
        });
        expect(viewerDenialFromResponse(error('ticket_expired'))).toMatchObject({
            category: 'ticket',
            action: 'start_fresh',
        });
        const risk = viewerDenialFromResponse(error('automation_risk_high'));
        expect(risk.explanation).toContain('automation pattern');
        expect(risk.explanation).toContain('No human-identity judgment');
        expect(risk.explanation).not.toMatch(/\d/gu);
    });

    it('rejects unknown fields and unsupported codes before presentation', () => {
        expect(() =>
            viewerDenialFromResponse({ ...error('consent_required'), detail: 'secret' }),
        ).toThrow();
        expect(() => viewerDenialFromResponse(error('raw_score' as CtxErrorCodeV1))).toThrow();
    });

    it('reduces every denial to a generic Host lifecycle state', () => {
        const hostPayloads = CTX_ERROR_CODES.map((code) =>
            hostLifecycleState(viewerDenialFromResponse(error(code))),
        );
        const serialized = JSON.stringify(hostPayloads);

        expect(new Set(hostPayloads.map(({ state }) => state))).toEqual(
            new Set(['locked', 'unavailable', 'unsupported']),
        );
        for (const code of CTX_ERROR_CODES) expect(serialized).not.toContain(code);
        expect(serialized).not.toMatch(/title|explanation|action|protocol/gu);
    });

    it('preserves only the protocol retry hint inside the trusted Viewer', () => {
        const denial: ViewerDenialPresentation = viewerDenialFromResponse(
            error('temporarily_unavailable', true),
        );

        expect(denial.canRetryLater).toBe(true);
        expect(hostLifecycleState(denial)).toEqual({ state: 'unavailable' });
    });
});
