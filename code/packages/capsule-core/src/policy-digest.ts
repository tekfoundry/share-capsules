import { canonicalizeJsonBytes } from './canonical-json.js';
import { sha256Base64Url, type DigestProvider } from './entry-commitment.js';
import { parseCtxPolicyV1 } from './policy.js';

export function canonicalizeCtxPolicyV1(value: unknown): Uint8Array {
    return canonicalizeJsonBytes(parseCtxPolicyV1(value));
}

export async function ctxPolicySha256(value: unknown, provider?: DigestProvider): Promise<string> {
    return sha256Base64Url(canonicalizeCtxPolicyV1(value), provider);
}
