import {
    canonicalizeCapsuleManifest,
    canonicalizeCtxPolicyV1,
    canonicalizeJson,
    decryptPayloadV1,
    encodeBase64Url,
    encryptPayloadV1,
    importEd25519PublicKey,
    sha256Base64Url,
    signCapsuleManifest,
    signDetachedEd25519,
    verifyCapsuleManifestSignature,
    verifyDetachedEd25519,
} from '@sharecapsules/capsule-core';
import {
    CtxHpkeError,
    ctxHpkeAadV1,
    ctxHpkeInfoV1,
    deriveCtxX25519KeyPairForTest,
    importCtxX25519PublicKey,
    openCtxContentKeyV1,
    parseCtxTicketClaimsV1,
    parseCtxTicketHeaderV1,
    sealCtxContentKeyV1,
    serializeCtxX25519PrivateKey,
    serializeCtxX25519PublicKey,
} from '@sharecapsules/ctx-client';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './capsule/manifest-v1.js';
import { cryptographicVectorsV1 as vectors } from './vectors-v1.js';

const encoder = new TextEncoder();

describe('cross-language cryptographic and canonicalization vectors V1', () => {
    it('is an immutable, conspicuously test-only versioned vector set', () => {
        expect(vectors.vector_set).toBe('ctx-capsule-cryptographic-vectors');
        expect(vectors.version).toBe(1);
        expect(vectors.warning).toBe(
            'TEST-ONLY KEY MATERIAL. NEVER USE THESE KEYS OR NONCES IN PRODUCTION.',
        );
        expect(Object.isFrozen(vectors)).toBe(true);
        expect(Object.isFrozen(vectors.hpke_key_release)).toBe(true);
    });

    it('reproduces the RFC 8785 canonical JSON bytes and SHA-256 result', async () => {
        const canonical = canonicalizeJson(vectors.canonical_json.input);

        expect(canonical).toBe(vectors.canonical_json.canonical_utf8);
        await expect(sha256Base64Url(encoder.encode(canonical))).resolves.toBe(
            vectors.canonical_json.sha256_base64url,
        );
    });

    it('reproduces canonical embedded-policy bytes and digest', async () => {
        const canonical = canonicalizeCtxPolicyV1(validManifestV1.policy);

        expect(new TextDecoder().decode(canonical)).toBe(vectors.policy.canonical_utf8);
        await expect(sha256Base64Url(canonical)).resolves.toBe(vectors.policy.sha256_base64url);
    });

    it('reproduces canonical manifest bytes, digest, Ed25519 public key, and signature', async () => {
        const manifestBytes = canonicalizeCapsuleManifest(validManifestV1);
        const keys = await ed25519VectorKeys();
        const signature = await signCapsuleManifest(validManifestV1, keys);

        expect(new TextDecoder().decode(manifestBytes)).toBe(vectors.manifest.canonical_utf8);
        await expect(sha256Base64Url(manifestBytes)).resolves.toBe(
            vectors.manifest.sha256_base64url,
        );
        expect(toHex(signature)).toBe(vectors.manifest.ed25519.signature_hex);
        await expect(verifyCapsuleManifestSignature(validManifestV1, signature)).resolves.toBe(
            true,
        );
    });

    it('reproduces the encrypted-entry byte recipe and SHA-256 commitment', async () => {
        const bytes = byteRecipe(vectors.entry_commitment.recipe);

        await expect(sha256Base64Url(bytes)).resolves.toBe(
            vectors.entry_commitment.sha256_base64url,
        );
        expect(vectors.entry_commitment.sha256_base64url).toBe(
            validManifestV1.payloads[0].ciphertext_sha256,
        );
    });

    it('reproduces AES-256-GCM payload AAD, ciphertext, tag, and plaintext', async () => {
        const plaintext = byteRecipe(vectors.payload_encryption.plaintext_recipe);
        const contentKey = fromHex(vectors.payload_encryption.content_key_hex);
        const nonce = fromHex(vectors.payload_encryption.nonce_hex);
        const context = {
            type: 'ctx-capsule-payload-aad' as const,
            version: '1.0' as const,
            cryptographic_suite: 'ctx-capsule-v1' as const,
            capsule: {
                id: validManifestV1.capsule.id,
                revision: validManifestV1.capsule.revision,
            },
            content_profile: {
                id: validManifestV1.content_profile.id,
                version: validManifestV1.content_profile.version,
            },
            payload: {
                id: validManifestV1.payloads[0].id,
                path: validManifestV1.payloads[0].path,
                media_type: validManifestV1.payloads[0].media_type,
                plaintext_size: plaintext.byteLength,
            },
        };

        const encrypted = await encryptPayloadV1(plaintext, contentKey, nonce, context);
        expect(new TextDecoder().decode(encrypted.associatedData)).toBe(
            vectors.payload_encryption.aad_utf8,
        );
        expect(toHex(encrypted.ciphertext)).toBe(vectors.payload_encryption.ciphertext_hex);
        await expect(
            decryptPayloadV1(
                fromHex(vectors.payload_encryption.ciphertext_hex),
                contentKey,
                nonce,
                context,
            ),
        ).resolves.toEqual(plaintext);
    });

    it('reproduces and verifies the exact Ed25519 CTX compact ticket', async () => {
        const header = parseCtxTicketHeaderV1(vectors.ticket.header);
        const claims = parseCtxTicketClaimsV1(vectors.ticket.claims, {
            issuer: vectors.ticket.claims.iss,
            audience: vectors.ticket.claims.aud,
            now: vectors.ticket.claims.iat,
        });
        const encodedHeader = encodeBase64Url(encoder.encode(JSON.stringify(header)));
        const encodedClaims = encodeBase64Url(encoder.encode(JSON.stringify(claims)));
        const signingInput = `${encodedHeader}.${encodedClaims}`;
        const keys = await ed25519VectorKeys();
        const signature = await signDetachedEd25519(encoder.encode(signingInput), keys.privateKey);

        expect(signingInput).toBe(vectors.ticket.signing_input_ascii);
        expect(toHex(signature)).toBe(vectors.ticket.signature_hex);
        expect(`${signingInput}.${encodeBase64Url(signature)}`).toBe(vectors.ticket.compact);
        await expect(
            verifyDetachedEd25519(
                encoder.encode(signingInput),
                fromHex(vectors.ticket.signature_hex),
                keys.publicKey,
            ),
        ).resolves.toBe(true);
    });

    it('reproduces CTX HPKE info and AAD bindings exactly', async () => {
        const claims = parseCtxTicketClaimsV1(vectors.ticket.claims);

        expect(toHex(ctxHpkeInfoV1(claims))).toBe(vectors.hpke_key_release.info_hex);
        await expect(ctxHpkeAadV1(vectors.ticket.compact).then(toHex)).resolves.toBe(
            vectors.hpke_key_release.aad_hex,
        );
    });

    it('reproduces and opens the project X25519/HKDF-SHA-256/AES-256-GCM HPKE vector', async () => {
        const hpke = vectors.hpke_key_release;
        const recipientKeys = await deriveCtxX25519KeyPairForTest(fromHex(hpke.recipient_ikm_hex));

        await expect(
            serializeCtxX25519PrivateKey(recipientKeys.privateKey).then(toHex),
        ).resolves.toBe(hpke.recipient_private_key_hex);
        await expect(
            serializeCtxX25519PublicKey(recipientKeys.publicKey).then(toHex),
        ).resolves.toBe(hpke.recipient_public_key_hex);

        const sealed = await sealCtxContentKeyV1(
            fromHex(hpke.content_key_hex),
            recipientKeys.publicKey,
            fromHex(hpke.info_hex),
            fromHex(hpke.aad_hex),
            fromHex(hpke.ephemeral_ikm_hex),
        );
        expect(toHex(sealed.enc)).toBe(hpke.enc_hex);
        expect(toHex(sealed.ciphertext)).toBe(hpke.ciphertext_hex);
        await expect(
            openCtxContentKeyV1(
                sealed.enc,
                sealed.ciphertext,
                recipientKeys.privateKey,
                fromHex(hpke.info_hex),
                fromHex(hpke.aad_hex),
            ),
        ).resolves.toEqual(fromHex(hpke.content_key_hex));
    });

    it('fails HPKE closed for tampering, wrong context, and invalid lengths', async () => {
        const hpke = vectors.hpke_key_release;
        const recipientKeys = await deriveCtxX25519KeyPairForTest(fromHex(hpke.recipient_ikm_hex));
        const tampered = fromHex(hpke.ciphertext_hex);
        tampered[0] = (tampered[0] ?? 0) ^ 1;

        await expect(
            openCtxContentKeyV1(
                fromHex(hpke.enc_hex),
                tampered,
                recipientKeys.privateKey,
                fromHex(hpke.info_hex),
                fromHex(hpke.aad_hex),
            ),
        ).rejects.toMatchObject({ code: 'open_failed' });
        await expect(
            openCtxContentKeyV1(
                fromHex(hpke.enc_hex),
                fromHex(hpke.ciphertext_hex),
                recipientKeys.privateKey,
                fromHex(hpke.info_hex),
                encoder.encode('wrong aad'),
            ),
        ).rejects.toMatchObject({ code: 'open_failed' });
        await expect(
            openCtxContentKeyV1(
                new Uint8Array(31),
                fromHex(hpke.ciphertext_hex),
                recipientKeys.privateKey,
                fromHex(hpke.info_hex),
                fromHex(hpke.aad_hex),
            ),
        ).rejects.toBeInstanceOf(CtxHpkeError);

        const allZeroPublicKey = await importCtxX25519PublicKey(new Uint8Array(32));
        await expect(
            sealCtxContentKeyV1(
                fromHex(hpke.content_key_hex),
                allZeroPublicKey,
                fromHex(hpke.info_hex),
                fromHex(hpke.aad_hex),
                fromHex(hpke.ephemeral_ikm_hex),
            ),
        ).rejects.toMatchObject({ code: 'seal_failed' });
    });
});

async function ed25519VectorKeys(): Promise<CryptoKeyPair> {
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        asArrayBuffer(
            fromHex('302e020100300506032b657004220420' + vectors.manifest.ed25519.private_seed_hex),
        ),
        'Ed25519',
        false,
        ['sign'],
    );
    const publicKey = await importEd25519PublicKey(
        fromHex(vectors.manifest.ed25519.public_key_hex),
    );
    return { privateKey, publicKey };
}

function byteRecipe(recipe: { readonly length: number; readonly modulus: number }): Uint8Array {
    return Uint8Array.from({ length: recipe.length }, (_, index) => index % recipe.modulus);
}

function fromHex(value: string): Uint8Array {
    return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function toHex(value: Uint8Array): string {
    return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
