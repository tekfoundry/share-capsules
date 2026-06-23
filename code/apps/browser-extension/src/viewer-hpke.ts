import {
    canonicalizeJsonBytes,
    decodeBase64Url,
    sha256Base64Url,
} from '@sharecapsules/capsule-core';

import type { StoredViewerDeviceKeys } from './viewer-device.js';

const KEM_ID = new Uint8Array([0x00, 0x20]);
const KDF_ID = new Uint8Array([0x00, 0x01]);
const AEAD_ID = new Uint8Array([0x00, 0x02]);
const KEM_SUITE_ID = concat(utf8('KEM'), KEM_ID);
const HPKE_SUITE_ID = concat(utf8('HPKE'), KEM_ID, KDF_ID, AEAD_ID);
const VERSION_LABEL = utf8('HPKE-v1');
const CONTENT_KEY_BYTES = 32;
const HASH_BYTES = 32;
const NONCE_BYTES = 12;
const ENCAPSULATED_KEY_BYTES = 32;
const CIPHERTEXT_BYTES = 48;

export class ViewerHpkeOpenError extends Error {
    public constructor() {
        super('The broker key release could not be unwrapped.');
        this.name = 'ViewerHpkeOpenError';
    }
}

export interface ViewerTicketClaimsV1 {
    readonly iss: string;
    readonly aud: string;
    readonly jti: string;
    readonly iat: number;
    readonly nbf: number;
    readonly exp: number;
    readonly ctx: {
        readonly version: 1;
        readonly capsule_id: string;
        readonly capsule_revision: number;
        readonly policy_sha256: string;
        readonly payload_id: string;
        readonly release_handle: string;
        readonly action: 'render';
        readonly cryptographic_suite: 'ctx-capsule-v1';
        readonly proof_jkt: string;
        readonly agreement_jkt: string;
    };
}

export async function openViewerContentKey(
    enc: Uint8Array,
    ciphertext: Uint8Array,
    device: StoredViewerDeviceKeys,
    claims: ViewerTicketClaimsV1,
    ticket: string,
    cryptography: Pick<Crypto, 'subtle'> = crypto,
): Promise<Uint8Array> {
    try {
        assertLength(enc, ENCAPSULATED_KEY_BYTES);
        assertLength(ciphertext, CIPHERTEXT_BYTES);
        const senderPublic = await cryptography.subtle.importKey(
            'raw',
            toArrayBuffer(enc),
            { name: 'X25519' },
            false,
            [],
        );
        const dh = new Uint8Array(
            await cryptography.subtle.deriveBits(
                { name: 'X25519', public: senderPublic },
                device.agreementPrivateKey,
                256,
            ),
        );
        const recipientPublic = decodeBase64Url(device.agreementPublicKey.x);
        assertLength(recipientPublic, ENCAPSULATED_KEY_BYTES);
        const sharedSecret = await kemExtractAndExpand(
            dh,
            concat(enc, recipientPublic),
            cryptography,
        );
        const schedule = await hpkeKeySchedule(sharedSecret, ctxHpkeInfoV1(claims), cryptography);
        const plaintext = new Uint8Array(
            await cryptography.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: toArrayBuffer(schedule.baseNonce),
                    additionalData: toArrayBuffer(await ctxHpkeAadV1(ticket)),
                    tagLength: 128,
                },
                schedule.key,
                toArrayBuffer(ciphertext),
            ),
        );
        assertLength(plaintext, CONTENT_KEY_BYTES);

        return plaintext;
    } catch (error) {
        if (error instanceof ViewerHpkeOpenError) throw error;
        throw new ViewerHpkeOpenError();
    }
}

function ctxHpkeInfoV1(claims: ViewerTicketClaimsV1): Uint8Array {
    return concat(
        utf8('CTX-Key-Release-HPKE-v1\0'),
        canonicalizeJsonBytes({
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
        }),
    );
}

async function ctxHpkeAadV1(ticket: string): Promise<Uint8Array> {
    return concat(
        utf8('CTX-Key-Release-AAD-v1\0'),
        canonicalizeJsonBytes({
            ticket_sha256: await sha256Base64Url(new TextEncoder().encode(ticket)),
        }),
    );
}

async function kemExtractAndExpand(
    dh: Uint8Array,
    kemContext: Uint8Array,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    const eaePrk = await labeledExtract(
        new Uint8Array(),
        KEM_SUITE_ID,
        'eae_prk',
        dh,
        cryptography,
    );

    return labeledExpand(
        eaePrk,
        KEM_SUITE_ID,
        'shared_secret',
        kemContext,
        HASH_BYTES,
        cryptography,
    );
}

async function hpkeKeySchedule(
    sharedSecret: Uint8Array,
    info: Uint8Array,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<{ readonly key: CryptoKey; readonly baseNonce: Uint8Array }> {
    const empty = new Uint8Array();
    const pskIdHash = await labeledExtract(
        empty,
        HPKE_SUITE_ID,
        'psk_id_hash',
        empty,
        cryptography,
    );
    const infoHash = await labeledExtract(empty, HPKE_SUITE_ID, 'info_hash', info, cryptography);
    const context = concat(new Uint8Array([0]), pskIdHash, infoHash);
    const secretIkm = labeledIkm(HPKE_SUITE_ID, 'secret', empty);
    const rawKey = await extractAndExpand(
        sharedSecret,
        secretIkm,
        labeledInfo(HPKE_SUITE_ID, 'key', context, CONTENT_KEY_BYTES),
        CONTENT_KEY_BYTES,
        cryptography,
    );
    const key = await cryptography.subtle.importKey(
        'raw',
        toArrayBuffer(rawKey),
        { name: 'AES-GCM' },
        false,
        ['decrypt'],
    );
    const baseNonce = await extractAndExpand(
        sharedSecret,
        secretIkm,
        labeledInfo(HPKE_SUITE_ID, 'base_nonce', context, NONCE_BYTES),
        NONCE_BYTES,
        cryptography,
    );

    return { key, baseNonce };
}

async function labeledExtract(
    salt: Uint8Array,
    suiteId: Uint8Array,
    label: string,
    ikm: Uint8Array,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    return hmac(
        salt.byteLength === 0 ? new Uint8Array(HASH_BYTES) : salt,
        labeledIkm(suiteId, label, ikm),
        cryptography,
    );
}

async function labeledExpand(
    prk: Uint8Array,
    suiteId: Uint8Array,
    label: string,
    info: Uint8Array,
    length: number,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    return hkdfExpand(prk, labeledInfo(suiteId, label, info, length), length, cryptography);
}

function labeledIkm(suiteId: Uint8Array, label: string, ikm: Uint8Array): Uint8Array {
    return concat(VERSION_LABEL, suiteId, utf8(label), ikm);
}

function labeledInfo(
    suiteId: Uint8Array,
    label: string,
    info: Uint8Array,
    length: number,
): Uint8Array {
    return concat(
        new Uint8Array([(length >> 8) & 0xff, length & 0xff]),
        VERSION_LABEL,
        suiteId,
        utf8(label),
        info,
    );
}

async function extractAndExpand(
    salt: Uint8Array,
    ikm: Uint8Array,
    info: Uint8Array,
    length: number,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    return hkdfExpand(
        await hmac(salt.byteLength === 0 ? new Uint8Array(HASH_BYTES) : salt, ikm, cryptography),
        info,
        length,
        cryptography,
    );
}

async function hkdfExpand(
    prk: Uint8Array,
    info: Uint8Array,
    length: number,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    const blocks: Uint8Array<ArrayBufferLike>[] = [];
    let previous: Uint8Array<ArrayBufferLike> = new Uint8Array();
    for (let counter = 1, generated = 0; generated < length; counter += 1) {
        previous = await hmac(prk, concat(previous, info, new Uint8Array([counter])), cryptography);
        blocks.push(previous);
        generated += previous.byteLength;
    }

    return copyBytes(concat(...blocks).slice(0, length));
}

async function hmac(
    keyBytes: Uint8Array,
    data: Uint8Array,
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<Uint8Array> {
    const key = await cryptography.subtle.importKey(
        'raw',
        toArrayBuffer(keyBytes),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
    );

    return copyBytes(
        new Uint8Array(await cryptography.subtle.sign('HMAC', key, toArrayBuffer(data))),
    );
}

function concat(...arrays: readonly Uint8Array<ArrayBufferLike>[]): Uint8Array<ArrayBuffer> {
    const result = new Uint8Array(arrays.reduce((sum, value) => sum + value.byteLength, 0));
    let offset = 0;
    for (const value of arrays) {
        result.set(value, offset);
        offset += value.byteLength;
    }

    return result;
}

function utf8(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

function assertLength(value: Uint8Array, expected: number): void {
    if (value.byteLength !== expected) throw new ViewerHpkeOpenError();
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy;
}
