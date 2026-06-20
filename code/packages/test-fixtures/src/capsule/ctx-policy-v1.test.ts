import {
    ACCOUNT_ACTIVE_PREDICATE,
    ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
    AUTOMATION_RISK_NOT_HIGH_PREDICATE,
    CAPSULE_LIFETIME_LIMIT_PREDICATE,
    CTX_POLICY_LIMIT_MAXIMUM,
    CTX_POLICY_PREDICATE_ORDER,
    CTX_POLICY_REQUIRED_PREDICATES,
    DEVICE_REGISTERED_PREDICATE,
    EMAIL_VERIFIED_PREDICATE,
    PolicyValidationError,
    VIEW_EVENT_CONSENT_PREDICATE,
    canonicalizeCtxPolicyV1,
    ctxPolicySha256,
    parseCapsuleManifest,
    parseCtxPolicyV1,
    type CtxPolicyV1,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

import { validManifestV1 } from './manifest-v1.js';

describe('CTX embedded Policy V1', () => {
    it('locks the exact type, version, combiner, mandatory predicates, and canonical order', () => {
        const policy = parseCtxPolicyV1(baselinePolicy());

        expect(policy).toEqual({
            type: 'ctx-policy',
            version: 1,
            combiner: 'all',
            requirements: [
                { predicate: 'ctx.account.email-verified', equals: true },
                { predicate: 'ctx.account.active', equals: true },
                { predicate: 'ctx.viewer.device-registered', equals: true },
                { predicate: 'ctx.consent.capsule-view-event', equals: true },
            ],
        });
        expect(CTX_POLICY_REQUIRED_PREDICATES).toEqual([
            EMAIL_VERIFIED_PREDICATE,
            ACCOUNT_ACTIVE_PREDICATE,
            DEVICE_REGISTERED_PREDICATE,
            VIEW_EVENT_CONSENT_PREDICATE,
        ]);
        expect(CTX_POLICY_PREDICATE_ORDER).toEqual([
            ...CTX_POLICY_REQUIRED_PREDICATES,
            CAPSULE_LIFETIME_LIMIT_PREDICATE,
            ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
            AUTOMATION_RISK_NOT_HIGH_PREDICATE,
        ]);
    });

    it('returns an immutable policy and immutable requirements', () => {
        const policy = parseCtxPolicyV1(baselinePolicy());

        expect(Object.isFrozen(policy)).toBe(true);
        expect(Object.isFrozen(policy.requirements)).toBe(true);
        for (const requirement of policy.requirements) {
            expect(Object.isFrozen(requirement)).toBe(true);
        }
    });

    it.each(CTX_POLICY_REQUIRED_PREDICATES)(
        'rejects omission of mandatory predicate %s',
        (predicate) => {
            const value = baselinePolicy();
            value.requirements = value.requirements.filter(
                (requirement) => requirement.predicate !== predicate,
            );

            expect(() => parseCtxPolicyV1(value)).toThrow(PolicyValidationError);
        },
    );

    it('rejects duplicate predicates even when every mandatory predicate remains present', () => {
        const value = baselinePolicy();
        value.requirements.push({ predicate: VIEW_EVENT_CONSENT_PREDICATE, equals: true });

        expect(() => parseCtxPolicyV1(value)).toThrow(PolicyValidationError);
    });

    it('rejects non-canonical requirement ordering instead of assigning a second digest to the same meaning', () => {
        const value = baselinePolicy();
        [value.requirements[0], value.requirements[1]] = [
            value.requirements[1]!,
            value.requirements[0]!,
        ];

        expect(() => parseCtxPolicyV1(value)).toThrow(PolicyValidationError);
    });

    it.each([
        ['type', { type: 'policy' }],
        ['version', { version: 2 }],
        ['combiner', { combiner: 'any' }],
    ] as const)('rejects an unsupported policy %s', (_, change) => {
        const value = { ...baselinePolicy(), ...change };

        expect(() => parseCtxPolicyV1(value)).toThrow(PolicyValidationError);
    });

    it.each(['ctx.account.age', 'ctx.score.trust', '', 'CTX.ACCOUNT.ACTIVE'])(
        'rejects unknown predicate %s',
        (predicate) => {
            const value = baselinePolicy() as unknown as MutablePolicy;
            value.requirements[0]!.predicate = predicate;

            expect(() => parseCtxPolicyV1(value)).toThrow(PolicyValidationError);
        },
    );

    it('rejects unknown fields, operators, nesting, and executable expressions', () => {
        const unknownField = baselinePolicy() as unknown as MutablePolicy;
        unknownField.requirements[0]!.score = 5;

        const nested = baselinePolicy() as unknown as Record<string, unknown>;
        nested.requirements = [{ any: baselinePolicy().requirements }];

        const expression = baselinePolicy() as unknown as Record<string, unknown>;
        expression.expression = 'viewer.score > 5';

        expect(() => parseCtxPolicyV1(unknownField)).toThrow(PolicyValidationError);
        expect(() => parseCtxPolicyV1(nested)).toThrow(PolicyValidationError);
        expect(() => parseCtxPolicyV1(expression)).toThrow(PolicyValidationError);
    });

    it.each([1, 3, CTX_POLICY_LIMIT_MAXIMUM])(
        'accepts independently configured lifetime maximum %s',
        (maximum) => {
            expect(() =>
                parseCtxPolicyV1(
                    policyWithOptionalRequirements(
                        { predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE, scope: 'capsule', maximum },
                        {
                            predicate: ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
                            scope: 'account-and-capsule',
                            maximum,
                        },
                    ),
                ),
            ).not.toThrow();
        },
    );

    it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
        'rejects invalid lifetime maximum %s',
        (maximum) => {
            expect(() =>
                parseCtxPolicyV1(
                    policyWithOptionalRequirements({
                        predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE,
                        scope: 'capsule',
                        maximum,
                    }),
                ),
            ).toThrow(PolicyValidationError);
        },
    );

    it('accepts all optional requirements in their single canonical order', () => {
        const policy = parseCtxPolicyV1(
            policyWithOptionalRequirements(
                { predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE, scope: 'capsule', maximum: 5 },
                {
                    predicate: ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
                    scope: 'account-and-capsule',
                    maximum: 3,
                },
                {
                    predicate: AUTOMATION_RISK_NOT_HIGH_PREDICATE,
                    issuer: 'https://trust.example.test/assertions',
                },
            ),
        );

        expect(policy.requirements.map((requirement) => requirement.predicate)).toEqual(
            CTX_POLICY_PREDICATE_ORDER,
        );
    });

    it.each([
        'http://trust.example.test',
        'https://user:password@trust.example.test',
        'https://trust.example.test?model=v1',
        'https://trust.example.test#result',
        'not-a-url',
    ])('rejects unsafe automation-risk issuer %s', (issuer) => {
        expect(() =>
            parseCtxPolicyV1(
                policyWithOptionalRequirements({
                    predicate: AUTOMATION_RISK_NOT_HIGH_PREDICATE,
                    issuer,
                }),
            ),
        ).toThrow(PolicyValidationError);
    });

    it('produces exact canonical policy bytes and a stable SHA-256 digest', async () => {
        const policy = baselinePolicy();
        const reorderedObjects = Object.fromEntries(
            Object.entries(policy)
                .reverse()
                .map(([key, value]) => [
                    key,
                    key === 'requirements'
                        ? policy.requirements.map((requirement) =>
                              Object.fromEntries(Object.entries(requirement).reverse()),
                          )
                        : value,
                ]),
        );

        expect(new TextDecoder().decode(canonicalizeCtxPolicyV1(policy))).toBe(
            '{"combiner":"all","requirements":[{"equals":true,"predicate":"ctx.account.email-verified"},{"equals":true,"predicate":"ctx.account.active"},{"equals":true,"predicate":"ctx.viewer.device-registered"},{"equals":true,"predicate":"ctx.consent.capsule-view-event"}],"type":"ctx-policy","version":1}',
        );
        await expect(ctxPolicySha256(reorderedObjects)).resolves.toBe(
            await ctxPolicySha256(policy),
        );
    });

    it('changes the policy digest when a creator adds an access gate', async () => {
        expect(
            await ctxPolicySha256(
                policyWithOptionalRequirements({
                    predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE,
                    scope: 'capsule',
                    maximum: 5,
                }),
            ),
        ).not.toBe(await ctxPolicySha256(baselinePolicy()));
    });

    it('enforces the complete policy contract through manifest parsing', () => {
        expect(() => parseCapsuleManifest(validManifestV1)).not.toThrow();

        const invalid = structuredClone(validManifestV1) as unknown as {
            policy: ReturnType<typeof baselinePolicy>;
        };
        invalid.policy.requirements.pop();

        expect(() => parseCapsuleManifest(invalid)).toThrow();
    });
});

interface MutableRequirement {
    predicate: string;
    equals?: boolean;
    score?: number;
}

interface MutablePolicy {
    requirements: MutableRequirement[];
}

function baselinePolicy() {
    return {
        type: 'ctx-policy' as const,
        version: 1 as const,
        combiner: 'all' as const,
        requirements: [
            { predicate: EMAIL_VERIFIED_PREDICATE, equals: true as const },
            { predicate: ACCOUNT_ACTIVE_PREDICATE, equals: true as const },
            { predicate: DEVICE_REGISTERED_PREDICATE, equals: true as const },
            { predicate: VIEW_EVENT_CONSENT_PREDICATE, equals: true as const },
        ] as CtxPolicyV1['requirements'] extends readonly (infer T)[] ? T[] : never,
    };
}

function policyWithOptionalRequirements(
    ...optionalRequirements: CtxPolicyV1['requirements']
): CtxPolicyV1 {
    return {
        ...baselinePolicy(),
        requirements: [...baselinePolicy().requirements, ...optionalRequirements],
    };
}
