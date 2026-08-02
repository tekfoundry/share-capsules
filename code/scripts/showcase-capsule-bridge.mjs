#!/usr/bin/env node
import {
    CAPSULE_SUITE_ID,
    STATIC_IMAGE_PROFILE_ID,
    STATIC_IMAGE_PROFILE_VERSION,
    assembleCapsuleZipV1,
    ctxPolicySha256,
    decodeBase64Url,
    encodeBase64Url,
    encryptPayloadV1,
    generatePayloadContentKey,
    generatePayloadNonce,
    importEd25519PublicKey,
    parseCapsuleManifest,
    payloadPath,
    sha256,
    sha256Base64Url,
    signCapsuleManifest,
    verifyCapsuleZipV1,
} from '@sharecapsules/capsule-core';
import {
    StaticImageCreatorProfileV1,
    buildCtxPolicyV1,
    createBrokerRegistrationId,
    parseCreatorStudioDraftV1,
} from '@sharecapsules/capsule-creator';
import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';

const cryptoApi = globalThis.crypto ?? webcrypto;

class BridgeFailure extends Error {
    constructor(code) {
        super(code);
        this.name = 'BridgeFailure';
        this.code = code;
    }
}

class NodeStaticImageDecoder {
    async decode(bytes, mediaType) {
        return dimensions(bytes, mediaType);
    }
}

try {
    const request = await readRequest();
    const result =
        request.command === 'prepare'
            ? await prepare(request)
            : request.command === 'complete'
              ? await complete(request)
              : fail('unknown_command');
    process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
    const code =
        error instanceof BridgeFailure
            ? error.code
            : error instanceof Error
              ? `${error.name}: ${error.message}`
              : 'bridge_failed';
    process.stderr.write(`${code}\n`);
    process.exit(1);
}

async function prepare(request) {
    const sourcePath = requiredString(request, 'source_path');
    const statePath = requiredString(request, 'state_path');
    const contentKeyPath = requiredString(request, 'content_key_path');
    const ctxIssuer = requiredString(request, 'ctx_issuer');
    const automationRiskIssuer = requiredString(request, 'automation_risk_issuer');
    const slug = requiredString(request, 'slug');
    const title = requiredString(request, 'title');
    const description = requiredString(request, 'description');
    const draftPolicy = requiredRecord(request, 'draft_policy');
    const sourceBytes = new Uint8Array(await readFile(sourcePath));
    const source = Object.freeze({
        name: sourcePath.split('/').pop() ?? 'source-image',
        size: sourceBytes.byteLength,
        mediaType: '',
        read: async () => sourceBytes.slice(),
    });
    const profile = new StaticImageCreatorProfileV1(new NodeStaticImageDecoder());
    const inspection = await profile.inspect(source);
    if (!inspection.valid) fail('invalid_source_image');
    const metadata = inspection.metadata;
    const draft = parseCreatorStudioDraftV1({
        version: 1,
        description: { title, description },
        fallback: { alt_text: description },
        policy: draftPolicy,
    });
    const policy = buildCtxPolicyV1(draft, automationRiskIssuer);
    const policySha256 = await ctxPolicySha256(policy);
    const contentKey = generatePayloadContentKey();
    const nonce = generatePayloadNonce();
    const capsuleId = `urn:uuid:${cryptoApi.randomUUID()}`;
    const capsuleRevision = 1;
    const payloadId = 'primary';
    const path = payloadPath(payloadId);
    const aad = Object.freeze({
        type: 'ctx-capsule-payload-aad',
        version: '1.0',
        cryptographic_suite: CAPSULE_SUITE_ID,
        capsule: Object.freeze({ id: capsuleId, revision: capsuleRevision }),
        content_profile: Object.freeze({
            id: STATIC_IMAGE_PROFILE_ID,
            version: STATIC_IMAGE_PROFILE_VERSION,
        }),
        payload: Object.freeze({
            id: payloadId,
            path,
            media_type: metadata.mediaType,
            plaintext_size: sourceBytes.byteLength,
        }),
    });
    const encrypted = await encryptPayloadV1(sourceBytes, contentKey, nonce, aad);
    const signingKey = await cryptoApi.subtle.generateKey(
        { name: 'Ed25519', namedCurve: 'Ed25519' },
        true,
        ['sign', 'verify'],
    );
    const publicKeyRaw = new Uint8Array(
        await cryptoApi.subtle.exportKey('raw', signingKey.publicKey),
    );
    const privateKeyPkcs8 = new Uint8Array(
        await cryptoApi.subtle.exportKey('pkcs8', signingKey.privateKey),
    );
    const state = {
        version: 1,
        slug,
        ctx_issuer: ctxIssuer,
        capsule_id: capsuleId,
        capsule_revision: capsuleRevision,
        payload_id: payloadId,
        payload_path: path,
        created_at: canonicalInstant(new Date()),
        signing_key: {
            id: `showcase-${slug}-${cryptoApi.randomUUID()}`,
            algorithm: 'Ed25519',
            public_key: encodeBase64Url(publicKeyRaw),
            private_key_pkcs8: encodeBase64Url(privateKeyPkcs8),
        },
        description: { title, description },
        policy,
        metadata: {
            media_type: metadata.mediaType,
            encoded_bytes: metadata.encodedBytes,
            width: metadata.width,
            height: metadata.height,
            pixel_count: metadata.pixelCount,
        },
        encryption: {
            nonce: encodeBase64Url(nonce),
            ciphertext: encodeBase64Url(encrypted.ciphertext),
            ciphertext_sha256: await sha256Base64Url(encrypted.ciphertext),
        },
        registration: {
            registration_id: createBrokerRegistrationId(() => cryptoApi.randomUUID()),
            capsule_id: capsuleId,
            capsule_revision: capsuleRevision,
            payload_id: payloadId,
            policy_sha256: policySha256,
            policy,
            title,
            content_profile_id: STATIC_IMAGE_PROFILE_ID,
            content_profile_version: STATIC_IMAGE_PROFILE_VERSION,
            media_type: metadata.mediaType,
        },
    };
    await writeFile(statePath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    await writeFile(contentKeyPath, encodeBase64Url(contentKey), { mode: 0o600 });
    const contentKeyDigest = await sha256(contentKey);
    sourceBytes.fill(0);
    contentKey.fill(0);
    nonce.fill(0);
    privateKeyPkcs8.fill(0);

    return {
        type: 'showcase-capsule-prepare-result',
        version: 1,
        registration: snakeRegistration(state.registration),
        content_key_sha256: encodeBase64Url(contentKeyDigest),
        metadata: {
            width: metadata.width,
            height: metadata.height,
            media_type: metadata.mediaType,
            encoded_bytes: metadata.encodedBytes,
        },
    };
}

async function complete(request) {
    const statePath = requiredString(request, 'state_path');
    const archivePath = requiredString(request, 'archive_path');
    const releaseHandle = requiredString(request, 'release_handle');
    const broker = requiredString(request, 'broker');
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    const privateKeyPkcs8 = decodeBase64Url(requiredString(state.signing_key, 'private_key_pkcs8'));
    const publicKeyBytes = decodeBase64Url(requiredString(state.signing_key, 'public_key'));
    const ciphertext = decodeBase64Url(requiredString(state.encryption, 'ciphertext'));
    const nonce = requiredString(state.encryption, 'nonce');
    const privateKey = await cryptoApi.subtle.importKey(
        'pkcs8',
        privateKeyPkcs8,
        { name: 'Ed25519', namedCurve: 'Ed25519' },
        false,
        ['sign'],
    );
    const publicKey = await importEd25519PublicKey(publicKeyBytes);
    const manifest = await parseCapsuleManifest({
        type: 'capsule-manifest',
        format_version: '1.0',
        capsule: {
            id: requiredString(state, 'capsule_id'),
            revision: requiredNumber(state, 'capsule_revision'),
            created_at: requiredString(state, 'created_at'),
        },
        cryptographic_suite: CAPSULE_SUITE_ID,
        creator: {
            signing_key: {
                id: requiredString(state.signing_key, 'id'),
                algorithm: 'Ed25519',
                public_key: requiredString(state.signing_key, 'public_key'),
            },
        },
        content_profile: {
            id: STATIC_IMAGE_PROFILE_ID,
            version: STATIC_IMAGE_PROFILE_VERSION,
        },
        description: {
            title: requiredString(state.description, 'title'),
            description: requiredString(state.description, 'description'),
        },
        policy: requiredRecord(state, 'policy'),
        ctx: { issuer: requiredString(state, 'ctx_issuer') },
        payloads: [
            {
                id: requiredString(state, 'payload_id'),
                path: requiredString(state, 'payload_path'),
                media_type: requiredString(state.metadata, 'media_type'),
                plaintext_size: requiredNumber(state.metadata, 'encoded_bytes'),
                ciphertext_size: ciphertext.byteLength,
                ciphertext_sha256: requiredString(state.encryption, 'ciphertext_sha256'),
                encryption: { representation: 'whole', nonce },
                key_release: { broker, handle: releaseHandle },
                profile_metadata: {
                    width: requiredNumber(state.metadata, 'width'),
                    height: requiredNumber(state.metadata, 'height'),
                    pixel_count: requiredNumber(state.metadata, 'pixel_count'),
                },
            },
        ],
    });
    const signature = await signCapsuleManifest(manifest, { privateKey, publicKey });
    const archive = await assembleCapsuleZipV1(manifest, signature, ciphertext);
    await verifyCapsuleZipV1(archive);
    await writeFile(archivePath, archive, { mode: 0o644 });
    privateKeyPkcs8.fill(0);
    ciphertext.fill(0);

    return {
        type: 'showcase-capsule-complete-result',
        version: 1,
        verified: true,
        archive: {
            bytes: archive.byteLength,
            sha256: encodeBase64Url(await sha256(archive)),
        },
    };
}

function dimensions(bytes, mediaType) {
    if (mediaType === 'image/jpeg') return jpegDimensions(bytes);
    if (mediaType === 'image/png') {
        return {
            width: readU32Be(bytes, 16),
            height: readU32Be(bytes, 20),
        };
    }
    if (mediaType === 'image/webp') return webpDimensions(bytes);
    fail('unsupported_image_type');
}

function jpegDimensions(bytes) {
    let cursor = 2;
    while (cursor + 9 < bytes.byteLength) {
        if (bytes[cursor] !== 0xff) fail('malformed_jpeg');
        let marker = bytes[cursor + 1];
        while (marker === 0xff) {
            cursor += 1;
            marker = bytes[cursor + 1];
        }
        cursor += 2;
        if (marker === 0xd9 || marker === 0xda) break;
        if (cursor + 2 > bytes.byteLength) fail('malformed_jpeg');
        const length = readU16Be(bytes, cursor);
        if (length < 2 || cursor + length > bytes.byteLength) fail('malformed_jpeg');
        if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
        ) {
            if (length < 7) fail('malformed_jpeg');
            return {
                height: readU16Be(bytes, cursor + 3),
                width: readU16Be(bytes, cursor + 5),
            };
        }
        cursor += length;
    }
    fail('malformed_jpeg');
}

function webpDimensions(bytes) {
    const chunk = ascii(bytes, 12, 4);
    if (chunk === 'VP8 ') {
        return {
            width: readU16Le(bytes, 26) & 0x3fff,
            height: readU16Le(bytes, 28) & 0x3fff,
        };
    }
    if (chunk === 'VP8L') {
        const b0 = bytes[21];
        const b1 = bytes[22];
        const b2 = bytes[23];
        const b3 = bytes[24];
        return {
            width: 1 + (((b1 & 0x3f) << 8) | b0),
            height: (1 + ((b3 & 0x0f) << 10)) | (b2 << 2) | ((b1 & 0xc0) >> 6),
        };
    }
    if (chunk === 'VP8X') {
        return {
            width: 1 + readU24Le(bytes, 24),
            height: 1 + readU24Le(bytes, 27),
        };
    }
    fail('malformed_webp');
}

async function readRequest() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function snakeRegistration(registration) {
    return {
        registration_id: registration.registration_id,
        capsule_id: registration.capsule_id,
        capsule_revision: registration.capsule_revision,
        payload_id: registration.payload_id,
        policy_sha256: registration.policy_sha256,
        policy: registration.policy,
        title: registration.title,
        content_profile_id: registration.content_profile_id,
        content_profile_version: registration.content_profile_version,
        media_type: registration.media_type,
    };
}

function canonicalInstant(value) {
    return new Date(Math.floor(value.getTime() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
}

function readU16Be(bytes, offset) {
    return ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
}

function readU16Le(bytes, offset) {
    return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
}

function readU24Le(bytes, offset) {
    return (
        (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16)
    );
}

function readU32Be(bytes, offset) {
    return (
        (bytes[offset] ?? 0) * 0x1000000 +
        (((bytes[offset + 1] ?? 0) << 16) |
            ((bytes[offset + 2] ?? 0) << 8) |
            (bytes[offset + 3] ?? 0))
    );
}

function ascii(bytes, offset, length) {
    return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function requiredString(record, key) {
    const value = record?.[key];
    if (typeof value !== 'string' || value.length === 0) fail(`invalid_${key}`);
    return value;
}

function requiredNumber(record, key) {
    const value = record?.[key];
    if (!Number.isSafeInteger(value)) fail(`invalid_${key}`);
    return value;
}

function requiredRecord(record, key) {
    const value = record?.[key];
    if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`invalid_${key}`);
    return value;
}

function fail(code) {
    throw new BridgeFailure(code);
}
