import { Aes256Gcm, CipherSuite, HkdfSha256 } from '@hpke/core';
import { DhkemX25519HkdfSha256 } from '@hpke/dhkem-x25519';

export const CTX_CONTENT_KEY_BYTES = 32 as const;
export const CTX_X25519_KEY_BYTES = 32 as const;
export const CTX_HPKE_ENCAPSULATED_KEY_BYTES = 32 as const;
export const CTX_HPKE_TAG_BYTES = 16 as const;

export class CtxHpkeError extends Error {
    public constructor(
        public readonly code:
            | 'invalid_content_key'
            | 'invalid_recipient_key'
            | 'invalid_encapsulated_key'
            | 'invalid_ciphertext'
            | 'seal_failed'
            | 'open_failed',
        message: string,
    ) {
        super(message);
        this.name = 'CtxHpkeError';
    }
}

export interface CtxHpkeSealResultV1 {
    readonly enc: Uint8Array;
    readonly ciphertext: Uint8Array;
}

const suite = new CipherSuite({
    kem: new DhkemX25519HkdfSha256(),
    kdf: new HkdfSha256(),
    aead: new Aes256Gcm(),
});

export async function importCtxX25519PublicKey(rawKey: Uint8Array): Promise<CryptoKey> {
    assertLength(rawKey, CTX_X25519_KEY_BYTES, 'invalid_recipient_key', 'X25519 public key');
    try {
        return await suite.kem.importKey('raw', asArrayBuffer(rawKey), true);
    } catch {
        throw new CtxHpkeError('invalid_recipient_key', 'The X25519 public key is invalid.');
    }
}

export async function importCtxX25519PrivateKey(rawKey: Uint8Array): Promise<CryptoKey> {
    assertLength(rawKey, CTX_X25519_KEY_BYTES, 'invalid_recipient_key', 'X25519 private key');
    try {
        return await suite.kem.importKey('raw', asArrayBuffer(rawKey), false);
    } catch {
        throw new CtxHpkeError('invalid_recipient_key', 'The X25519 private key is invalid.');
    }
}

/** Deterministic test-vector helper. Runtime device keys MUST use secure random generation. */
export async function deriveCtxX25519KeyPairForTest(ikm: Uint8Array): Promise<CryptoKeyPair> {
    if (ikm.byteLength < CTX_X25519_KEY_BYTES) {
        throw new CtxHpkeError(
            'invalid_recipient_key',
            'X25519 key derivation requires at least 32 bytes of input keying material.',
        );
    }
    try {
        return await suite.kem.deriveKeyPair(asArrayBuffer(ikm));
    } catch {
        throw new CtxHpkeError('invalid_recipient_key', 'X25519 key derivation failed.');
    }
}

export async function serializeCtxX25519PublicKey(key: CryptoKey): Promise<Uint8Array> {
    try {
        const serialized = new Uint8Array(await suite.kem.serializePublicKey(key));
        assertLength(
            serialized,
            CTX_X25519_KEY_BYTES,
            'invalid_recipient_key',
            'X25519 public key',
        );
        return serialized;
    } catch (error) {
        if (error instanceof CtxHpkeError) throw error;
        throw new CtxHpkeError('invalid_recipient_key', 'The X25519 public key is invalid.');
    }
}

export async function serializeCtxX25519PrivateKey(key: CryptoKey): Promise<Uint8Array> {
    try {
        const serialized = new Uint8Array(await suite.kem.serializePrivateKey(key));
        assertLength(
            serialized,
            CTX_X25519_KEY_BYTES,
            'invalid_recipient_key',
            'X25519 private key',
        );
        return serialized;
    } catch (error) {
        if (error instanceof CtxHpkeError) throw error;
        throw new CtxHpkeError('invalid_recipient_key', 'The X25519 private key is invalid.');
    }
}

export async function sealCtxContentKeyV1(
    contentKey: Uint8Array,
    recipientPublicKey: CryptoKey,
    info: Uint8Array,
    aad: Uint8Array,
    testOnlyEphemeralIkm?: Uint8Array,
): Promise<CtxHpkeSealResultV1> {
    assertLength(contentKey, CTX_CONTENT_KEY_BYTES, 'invalid_content_key', 'content key');
    try {
        const sealed = await suite.seal(
            {
                recipientPublicKey,
                info,
                ...(testOnlyEphemeralIkm === undefined ? {} : { ekm: testOnlyEphemeralIkm }),
            },
            contentKey,
            aad,
        );
        const enc = new Uint8Array(sealed.enc);
        const ciphertext = new Uint8Array(sealed.ct);
        assertLength(enc, CTX_HPKE_ENCAPSULATED_KEY_BYTES, 'seal_failed', 'HPKE encapsulated key');
        assertLength(
            ciphertext,
            CTX_CONTENT_KEY_BYTES + CTX_HPKE_TAG_BYTES,
            'seal_failed',
            'HPKE ciphertext',
        );
        return Object.freeze({ enc, ciphertext });
    } catch (error) {
        if (error instanceof CtxHpkeError) throw error;
        throw new CtxHpkeError('seal_failed', 'HPKE content-key sealing failed.');
    }
}

export async function openCtxContentKeyV1(
    enc: Uint8Array,
    ciphertext: Uint8Array,
    recipientKey: CryptoKey | CryptoKeyPair,
    info: Uint8Array,
    aad: Uint8Array,
): Promise<Uint8Array> {
    assertLength(
        enc,
        CTX_HPKE_ENCAPSULATED_KEY_BYTES,
        'invalid_encapsulated_key',
        'HPKE encapsulated key',
    );
    assertLength(
        ciphertext,
        CTX_CONTENT_KEY_BYTES + CTX_HPKE_TAG_BYTES,
        'invalid_ciphertext',
        'HPKE ciphertext',
    );
    try {
        const plaintext = new Uint8Array(
            await suite.open({ recipientKey, enc, info }, ciphertext, aad),
        );
        assertLength(plaintext, CTX_CONTENT_KEY_BYTES, 'open_failed', 'unwrapped content key');
        return plaintext;
    } catch (error) {
        if (error instanceof CtxHpkeError) throw error;
        throw new CtxHpkeError('open_failed', 'HPKE content-key opening failed.');
    }
}

function assertLength(
    value: Uint8Array,
    expected: number,
    code: CtxHpkeError['code'],
    label: string,
): void {
    if (value.byteLength !== expected) {
        throw new CtxHpkeError(code, `${label} must contain exactly ${expected} bytes.`);
    }
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
