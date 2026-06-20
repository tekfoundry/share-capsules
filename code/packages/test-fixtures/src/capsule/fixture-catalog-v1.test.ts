import {
    ManifestValidationError,
    canonicalizeCapsuleManifest,
    importEd25519PublicKey,
    parseCapsuleManifest,
    signCapsuleManifest,
    validateArchiveEntryNames,
    validateCapsuleEntryCommitments,
    validatePayloadEntryCommitment,
    verifyCapsuleManifestSignature,
} from '@sharecapsules/capsule-core';
import { beforeAll, describe, expect, it } from 'vitest';

import {
    CAPSULE_FIXTURE_CLASSIFICATIONS,
    archiveEntriesFixtureV1,
    capsuleContractFixtureCatalogV1,
    materializeManifestFixtureV1,
    payloadBytesFixtureV1,
    type CapsuleContractFixtureCaseV1,
} from './fixture-catalog-v1.js';
import { validManifestV1 } from './manifest-v1.js';

const RFC_8032_TEST_1_PRIVATE_SEED =
    '9d61b19deffd5a60ba844af492ec2cc4' + '4449c5697b326919703bac031cae7f60';
const RFC_8032_TEST_1_PUBLIC_KEY =
    'd75a980182b10ab7d54bfed3c964073a' + '0ee172f3daa62325af021a68f707511a';
const ED25519_PKCS8_SEED_PREFIX = '302e020100300506032b657004220420';

describe('cross-package Capsule contract fixture catalog V1', () => {
    let signingKeys: CryptoKeyPair;

    beforeAll(async () => {
        signingKeys = {
            privateKey: await crypto.subtle.importKey(
                'pkcs8',
                asArrayBuffer(fromHex(ED25519_PKCS8_SEED_PREFIX + RFC_8032_TEST_1_PRIVATE_SEED)),
                'Ed25519',
                false,
                ['sign'],
            ),
            publicKey: await importEd25519PublicKey(fromHex(RFC_8032_TEST_1_PUBLIC_KEY)),
        };
    });

    it('is language-neutral, immutable, uniquely identified, and covers every required class', () => {
        const identifiers = capsuleContractFixtureCatalogV1.cases.map(({ id }) => id);
        const classifications = new Set(
            capsuleContractFixtureCatalogV1.cases.map(({ classification }) => classification),
        );

        expect(capsuleContractFixtureCatalogV1.fixture_set).toBe('ctx-capsule-contract-fixtures');
        expect(capsuleContractFixtureCatalogV1.version).toBe(1);
        expect(new Set(identifiers).size).toBe(identifiers.length);
        expect(classifications).toEqual(new Set(CAPSULE_FIXTURE_CLASSIFICATIONS));
        expect(Object.isFrozen(capsuleContractFixtureCatalogV1)).toBe(true);
        expect(Object.isFrozen(capsuleContractFixtureCatalogV1.base_manifest)).toBe(true);
    });

    it('materializes a valid signed manifest, exact archive allowlist, and committed payload', async () => {
        const manifest = parseCapsuleManifest(materializeManifestFixtureV1('valid-baseline'));
        const payloadBytes = payloadBytesFixtureV1();
        const signature = await signCapsuleManifest(manifest, signingKeys);

        expect(manifest).toEqual(validManifestV1);
        expect(archiveEntriesFixtureV1('valid-baseline')).toEqual([
            'manifest.json',
            'manifest.sig',
            'payloads/primary.enc',
        ]);
        await expect(verifyCapsuleManifestSignature(manifest, signature)).resolves.toBe(true);
        await expect(
            validatePayloadEntryCommitment(manifest, payloadBytes),
        ).resolves.toBeUndefined();
        await expect(
            validateCapsuleEntryCommitments(manifest, [
                { name: 'manifest.json', bytes: canonicalizeCapsuleManifest(manifest) },
                { name: 'manifest.sig', bytes: signature },
                { name: 'payloads/primary.enc', bytes: payloadBytes },
            ]),
        ).resolves.toEqual(manifest);
    });

    it.each(
        capsuleContractFixtureCatalogV1.cases.filter(
            (fixtureCase) => fixtureCase.validation_layer === 'manifest',
        ),
    )('$id fails closed at the manifest layer', (fixtureCase) => {
        expectFixtureRejection(fixtureCase, () =>
            parseCapsuleManifest(materializeManifestFixtureV1(fixtureCase.id)),
        );
    });

    it.each(
        capsuleContractFixtureCatalogV1.cases.filter(
            (fixtureCase) => fixtureCase.validation_layer === 'archive',
        ),
    )('$id fails closed at the archive-name layer', (fixtureCase) => {
        expectFixtureRejection(fixtureCase, () =>
            validateArchiveEntryNames(validManifestV1, archiveEntriesFixtureV1(fixtureCase.id)),
        );
    });

    it.each(
        capsuleContractFixtureCatalogV1.cases.filter(
            (fixtureCase) => fixtureCase.validation_layer === 'manifest-signature',
        ),
    )('$id fails closed at the creator-signature layer', async (fixtureCase) => {
        const signature = await signCapsuleManifest(validManifestV1, signingKeys);

        await expect(
            verifyCapsuleManifestSignature(materializeManifestFixtureV1(fixtureCase.id), signature),
        ).resolves.toBe(false);
    });

    it.each(
        capsuleContractFixtureCatalogV1.cases.filter(
            (fixtureCase) => fixtureCase.validation_layer === 'entry-commitment',
        ),
    )('$id fails closed at the encrypted-entry commitment layer', async (fixtureCase) => {
        await expect(
            validatePayloadEntryCommitment(validManifestV1, payloadBytesFixtureV1(fixtureCase.id)),
        ).rejects.toMatchObject({ code: 'payload_digest_mismatch' });
    });

    it('does not let one materialized case mutate the authoritative base fixture', () => {
        const materialized = materializeManifestFixtureV1('valid-baseline') as {
            description: { title: string };
        };
        materialized.description.title = 'Local mutation';

        expect(validManifestV1.description?.title).toBe('Reference artwork');
    });
});

function expectFixtureRejection(
    fixtureCase: CapsuleContractFixtureCaseV1,
    operation: () => unknown,
): void {
    expect(fixtureCase.expected).toBe('reject');
    expect(operation).toThrow(ManifestValidationError);
}

function fromHex(value: string): Uint8Array {
    return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
    return value.slice().buffer;
}
