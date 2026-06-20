import {
    canonicalizeJsonBytes,
    sha256Base64Url,
    type DigestProvider,
} from '@sharecapsules/capsule-core';

import type { CtxTicketClaimsV1 } from './contracts.js';

export const CTX_HPKE_INFO_LABEL = 'CTX-Key-Release-HPKE-v1' as const;
export const CTX_HPKE_AAD_LABEL = 'CTX-Key-Release-AAD-v1' as const;

export interface CtxHpkeContextV1 {
    readonly type: 'ctx-key-release-context';
    readonly version: 1;
    readonly broker: string;
    readonly ticket_jti: string;
    readonly capsule_id: string;
    readonly capsule_revision: number;
    readonly payload_id: string;
    readonly release_handle: string;
    readonly action: 'render';
    readonly cryptographic_suite: 'ctx-capsule-v1';
    readonly agreement_jkt: string;
}

export function createCtxHpkeContextV1(claims: CtxTicketClaimsV1): CtxHpkeContextV1 {
    return Object.freeze({
        type: 'ctx-key-release-context',
        version: 1,
        broker: claims.aud,
        ticket_jti: claims.jti,
        capsule_id: claims.ctx.capsule_id,
        capsule_revision: claims.ctx.capsule_revision,
        payload_id: claims.ctx.payload_id,
        release_handle: claims.ctx.release_handle,
        action: claims.ctx.action,
        cryptographic_suite: claims.ctx.cryptographic_suite,
        agreement_jkt: claims.ctx.agreement_jkt,
    });
}

export function ctxHpkeInfoV1(claims: CtxTicketClaimsV1): Uint8Array {
    return labeledBytes(CTX_HPKE_INFO_LABEL, canonicalizeJsonBytes(createCtxHpkeContextV1(claims)));
}

export async function ctxHpkeAadV1(
    compactTicket: string,
    provider?: DigestProvider,
): Promise<Uint8Array> {
    const ticketSha256 = await sha256Base64Url(new TextEncoder().encode(compactTicket), provider);
    return labeledBytes(CTX_HPKE_AAD_LABEL, canonicalizeJsonBytes({ ticket_sha256: ticketSha256 }));
}

function labeledBytes(label: string, payload: Uint8Array): Uint8Array {
    const prefix = new TextEncoder().encode(`${label}\0`);
    const result = new Uint8Array(prefix.byteLength + payload.byteLength);
    result.set(prefix);
    result.set(payload, prefix.byteLength);
    return result;
}
