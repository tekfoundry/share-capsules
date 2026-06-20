import Ajv2020, { type ErrorObject } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import policySchema from './schema/ctx-policy-v1.schema.json' with { type: 'json' };

export const CTX_POLICY_TYPE = 'ctx-policy' as const;
export const CTX_POLICY_VERSION = 1 as const;
export const CTX_POLICY_COMBINER = 'all' as const;
export const CTX_POLICY_LIMIT_MAXIMUM = Number.MAX_SAFE_INTEGER;

export const EMAIL_VERIFIED_PREDICATE = 'ctx.account.email-verified' as const;
export const ACCOUNT_ACTIVE_PREDICATE = 'ctx.account.active' as const;
export const DEVICE_REGISTERED_PREDICATE = 'ctx.viewer.device-registered' as const;
export const VIEW_EVENT_CONSENT_PREDICATE = 'ctx.consent.capsule-view-event' as const;
export const CAPSULE_LIFETIME_LIMIT_PREDICATE = 'ctx.usage.capsule-lifetime-limit' as const;
export const ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE =
    'ctx.usage.capsule-account-lifetime-limit' as const;
export const AUTOMATION_RISK_NOT_HIGH_PREDICATE = 'ctx.risk.ecosystem-automation-not-high' as const;

export const CTX_POLICY_PREDICATE_ORDER = Object.freeze([
    EMAIL_VERIFIED_PREDICATE,
    ACCOUNT_ACTIVE_PREDICATE,
    DEVICE_REGISTERED_PREDICATE,
    VIEW_EVENT_CONSENT_PREDICATE,
    CAPSULE_LIFETIME_LIMIT_PREDICATE,
    ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
    AUTOMATION_RISK_NOT_HIGH_PREDICATE,
] as const);

export const CTX_POLICY_REQUIRED_PREDICATES = Object.freeze(CTX_POLICY_PREDICATE_ORDER.slice(0, 4));

export interface BooleanPolicyRequirementV1 {
    readonly predicate:
        | typeof EMAIL_VERIFIED_PREDICATE
        | typeof ACCOUNT_ACTIVE_PREDICATE
        | typeof DEVICE_REGISTERED_PREDICATE
        | typeof VIEW_EVENT_CONSENT_PREDICATE;
    readonly equals: true;
}

export interface CapsuleLifetimeLimitRequirementV1 {
    readonly predicate: typeof CAPSULE_LIFETIME_LIMIT_PREDICATE;
    readonly scope: 'capsule';
    readonly maximum: number;
}

export interface AccountCapsuleLifetimeLimitRequirementV1 {
    readonly predicate: typeof ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE;
    readonly scope: 'account-and-capsule';
    readonly maximum: number;
}

export interface AutomationRiskNotHighRequirementV1 {
    readonly predicate: typeof AUTOMATION_RISK_NOT_HIGH_PREDICATE;
    readonly issuer: string;
}

export type CtxPolicyRequirementV1 =
    | BooleanPolicyRequirementV1
    | CapsuleLifetimeLimitRequirementV1
    | AccountCapsuleLifetimeLimitRequirementV1
    | AutomationRiskNotHighRequirementV1;

export interface CtxPolicyV1 {
    readonly type: typeof CTX_POLICY_TYPE;
    readonly version: typeof CTX_POLICY_VERSION;
    readonly combiner: typeof CTX_POLICY_COMBINER;
    readonly requirements: readonly CtxPolicyRequirementV1[];
}

export interface PolicyValidationIssue {
    readonly path: string;
    readonly message: string;
}

export class PolicyValidationError extends Error {
    public constructor(public readonly issues: readonly PolicyValidationIssue[]) {
        super('CTX policy validation failed.');
        this.name = 'PolicyValidationError';
    }
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validatePolicySchema = ajv.compile<CtxPolicyV1>(policySchema);

export function validateCtxPolicyV1(value: unknown): asserts value is CtxPolicyV1 {
    if (!validatePolicySchema(value)) {
        throw new PolicyValidationError(schemaIssues(validatePolicySchema.errors));
    }

    const issues: PolicyValidationIssue[] = [];
    let previousOrder = -1;
    const seen = new Set<string>();

    for (const [index, requirement] of value.requirements.entries()) {
        const order = CTX_POLICY_PREDICATE_ORDER.indexOf(requirement.predicate);

        if (seen.has(requirement.predicate)) {
            issues.push({
                path: `/requirements/${index}/predicate`,
                message: 'must not duplicate a predicate',
            });
        }
        seen.add(requirement.predicate);

        if (order <= previousOrder) {
            issues.push({
                path: `/requirements/${index}/predicate`,
                message: 'must follow the canonical V1 predicate order',
            });
        }
        previousOrder = order;

        if (requirement.predicate === AUTOMATION_RISK_NOT_HIGH_PREDICATE) {
            validateHttpsIssuer(requirement.issuer, `/requirements/${index}/issuer`, issues);
        }
    }

    for (const [index, predicate] of CTX_POLICY_REQUIRED_PREDICATES.entries()) {
        if (value.requirements[index]?.predicate !== predicate) {
            issues.push({
                path: `/requirements/${index}`,
                message: `must be the mandatory ${predicate} requirement`,
            });
        }
    }

    if (issues.length > 0) {
        throw new PolicyValidationError(issues);
    }
}

export function parseCtxPolicyV1(value: unknown): CtxPolicyV1 {
    validateCtxPolicyV1(value);

    const requirements = value.requirements.map((requirement) =>
        Object.freeze(structuredClone(requirement)),
    );

    return Object.freeze({
        type: value.type,
        version: value.version,
        combiner: value.combiner,
        requirements: Object.freeze(requirements),
    });
}

function validateHttpsIssuer(issuer: string, path: string, issues: PolicyValidationIssue[]): void {
    try {
        const url = new URL(issuer);
        if (
            url.protocol !== 'https:' ||
            url.username !== '' ||
            url.password !== '' ||
            url.search !== '' ||
            url.hash !== ''
        ) {
            throw new Error('unsupported issuer URL components');
        }
    } catch {
        issues.push({
            path,
            message: 'must be an absolute HTTPS issuer URL without credentials, query, or fragment',
        });
    }
}

function schemaIssues(errors: ErrorObject[] | null | undefined): PolicyValidationIssue[] {
    return (errors ?? []).map((error) => ({
        path: error.instancePath || '/',
        message: error.message ?? 'is invalid',
    }));
}
