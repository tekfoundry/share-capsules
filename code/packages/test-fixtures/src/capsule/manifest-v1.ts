import type { CapsuleManifestV1 } from '@sharecapsules/capsule-core';

export const validManifestV1: CapsuleManifestV1 = {
    type: 'capsule-manifest',
    format_version: '1.0',
    capsule: {
        id: 'urn:uuid:018f4c3a-7b9d-4f2a-8c61-7a6e84e5a913',
        revision: 1,
        created_at: '2026-06-20T12:00:00Z',
    },
    cryptographic_suite: 'ctx-capsule-v1',
    creator: {
        signing_key: {
            id: 'creator-key-0001',
            algorithm: 'Ed25519',
            public_key: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
    },
    content_profile: {
        id: 'ctx.content.static-image',
        version: '1.0',
    },
    description: {
        title: 'Reference artwork',
        creator_display_name: 'Reference Creator',
    },
    policy: {
        type: 'ctx-policy',
        version: 1,
        combiner: 'all',
        requirements: [
            { predicate: 'ctx.account.email-verified', equals: true },
            { predicate: 'ctx.account.active', equals: true },
            { predicate: 'ctx.viewer.device-registered', equals: true },
            { predicate: 'ctx.consent.capsule-view-event', equals: true },
        ],
    },
    ctx: {
        issuer: 'https://sharecapsules.com',
    },
    payloads: [
        {
            id: 'primary',
            path: 'payloads/primary.enc',
            media_type: 'image/png',
            plaintext_size: 1024,
            ciphertext_size: 1040,
            ciphertext_sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            encryption: {
                representation: 'whole',
                nonce: 'AAAAAAAAAAAAAAAA',
            },
            key_release: {
                broker: 'https://broker.sharecapsules.com',
                handle: 'release-handle-0001',
            },
            profile_metadata: {
                width: 16,
                height: 16,
                pixel_count: 256,
            },
        },
    ],
};
