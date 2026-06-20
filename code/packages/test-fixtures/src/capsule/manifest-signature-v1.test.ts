import {
    Base64UrlError,
    ED25519_SIGNATURE_BYTES,
    ManifestSignatureError,
    decodeBase64Url,
    encodeBase64Url,
    importEd25519PublicKey,
    signCapsuleManifest,
    signDetachedEd25519,
    verifyCapsuleManifestSignature,
    verifyDetachedEd25519,
} from '@sharecapsules/capsule-core';
import { beforeAll, describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

const RFC_8032_TEST_1_PRIVATE_SEED =
    '9d61b19deffd5a60ba844af492ec2cc4' + '4449c5697b326919703bac031cae7f60';
const RFC_8032_TEST_1_PUBLIC_KEY =
    'd75a980182b10ab7d54bfed3c964073a' + '0ee172f3daa62325af021a68f707511a';
const RFC_8032_TEST_1_EMPTY_MESSAGE_SIGNATURE =
    'e5564300c360ac729086e2cc806e828a' +
    '84877f1eb8e5d974d873e06522490155' +
    '5fb8821590a33bacc61e39701cf9b46b' +
    'd25bf5f0595bbe24655141438e7a100b';
const ED25519_PKCS8_SEED_PREFIX = '302e020100300506032b657004220420';

describe('detached Ed25519 Capsule manifest signatures', () => {
    let signingKeys: CryptoKeyPair;
    let manifest: typeof validManifestV1;

    beforeAll(async () => {
        const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            asArrayBuffer(fromHex(ED25519_PKCS8_SEED_PREFIX + RFC_8032_TEST_1_PRIVATE_SEED)),
            'Ed25519',
            false,
            ['sign'],
        );
        const rawPublicKey = fromHex(RFC_8032_TEST_1_PUBLIC_KEY);
        const publicKey = await importEd25519PublicKey(rawPublicKey);

        signingKeys = { privateKey, publicKey };
        manifest = structuredClone(validManifestV1);
        manifest.creator.signing_key.public_key = encodeBase64Url(rawPublicKey);
    });

    it('matches the RFC 8032 Ed25519 empty-message test vector', async () => {
        const signature = await signDetachedEd25519(new Uint8Array(), signingKeys.privateKey);

        expect(toHex(signature)).toBe(RFC_8032_TEST_1_EMPTY_MESSAGE_SIGNATURE);
        await expect(
            verifyDetachedEd25519(new Uint8Array(), signature, signingKeys.publicKey),
        ).resolves.toBe(true);
    });

    it('produces a raw 64-byte manifest.sig and verifies the signed manifest', async () => {
        const signature = await signCapsuleManifest(manifest, signingKeys);

        expect(signature).toBeInstanceOf(Uint8Array);
        expect(signature.byteLength).toBe(ED25519_SIGNATURE_BYTES);
        await expect(verifyCapsuleManifestSignature(manifest, signature)).resolves.toBe(true);
    });

    it('verifies an equivalent manifest regardless of object insertion order', async () => {
        const signature = await signCapsuleManifest(manifest, signingKeys);
        const reordered = Object.fromEntries(Object.entries(manifest).reverse());

        await expect(verifyCapsuleManifestSignature(reordered, signature)).resolves.toBe(true);
    });

    it('rejects a manifest when any signed value changes', async () => {
        const signature = await signCapsuleManifest(manifest, signingKeys);
        const tampered = structuredClone(manifest);
        tampered.description!.title = 'Tampered artwork';

        await expect(verifyCapsuleManifestSignature(tampered, signature)).resolves.toBe(false);
    });

    it('rejects a signature made by a key other than the key declared in the manifest', async () => {
        const signature = await signCapsuleManifest(manifest, signingKeys);
        const otherKeys = (await crypto.subtle.generateKey('Ed25519', true, [
            'sign',
            'verify',
        ])) as CryptoKeyPair;
        const otherPublicKey = new Uint8Array(
            await crypto.subtle.exportKey('raw', otherKeys.publicKey),
        );
        const mismatched = structuredClone(manifest);
        mismatched.creator.signing_key.public_key = encodeBase64Url(otherPublicKey);

        await expect(verifyCapsuleManifestSignature(mismatched, signature)).resolves.toBe(false);
    });

    it('refuses to sign when the private key pair does not match the manifest creator key', async () => {
        const mismatched = structuredClone(manifest);
        mismatched.creator.signing_key.public_key = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        await expect(signCapsuleManifest(mismatched, signingKeys)).rejects.toMatchObject({
            code: 'signing_key_mismatch',
        });
    });

    it('refuses to emit a signature when a key-pair object contains unrelated keys', async () => {
        const otherKeys = (await crypto.subtle.generateKey('Ed25519', false, [
            'sign',
            'verify',
        ])) as CryptoKeyPair;
        const mixedKeys = {
            privateKey: otherKeys.privateKey,
            publicKey: signingKeys.publicKey,
        };

        await expect(signCapsuleManifest(manifest, mixedKeys)).rejects.toMatchObject({
            code: 'signing_key_mismatch',
        });
    });

    it('fails closed for truncated or extended detached signatures', async () => {
        const signature = await signCapsuleManifest(manifest, signingKeys);

        await expect(
            verifyCapsuleManifestSignature(manifest, signature.slice(0, 63)),
        ).resolves.toBe(false);
        await expect(
            verifyCapsuleManifestSignature(manifest, Uint8Array.from([...signature, 0])),
        ).resolves.toBe(false);
    });

    it('rejects invalid manifests before signing or verification', async () => {
        const invalid = { ...structuredClone(manifest), cryptographic_suite: 'ctx-capsule-v0' };

        await expect(signCapsuleManifest(invalid, signingKeys)).rejects.toThrow();
        await expect(verifyCapsuleManifestSignature(invalid, new Uint8Array(64))).rejects.toThrow();
    });

    it('rejects a public key passed where a private signing key is required', async () => {
        await expect(
            signDetachedEd25519(new Uint8Array(), signingKeys.publicKey),
        ).rejects.toBeInstanceOf(ManifestSignatureError);
    });

    it('rejects Ed25519 public keys with any length other than 32 bytes', async () => {
        await expect(importEd25519PublicKey(new Uint8Array(31))).rejects.toMatchObject({
            code: 'invalid_public_signing_key',
        });
    });

    it('round-trips canonical unpadded base64url and rejects alternate encodings', () => {
        const raw = fromHex(RFC_8032_TEST_1_PUBLIC_KEY);
        const encoded = encodeBase64Url(raw);

        expect(decodeBase64Url(encoded)).toEqual(raw);
        expect(() => decodeBase64Url(`${encoded}=`)).toThrow(Base64UrlError);
        expect(() => decodeBase64Url('*')).toThrow(Base64UrlError);
    });
});

function fromHex(value: string): Uint8Array {
    return Uint8Array.from(value.match(/.{2}/gu) ?? [], (byte) => Number.parseInt(byte, 16));
}

function toHex(value: Uint8Array): string {
    return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
