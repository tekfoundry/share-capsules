import { parseCapsuleManifest, type CapsuleManifestV1 } from '@sharecapsules/capsule-core';

import catalogJson from '../fixtures/capsule-contract-fixtures-v1.json' with { type: 'json' };

export const CAPSULE_FIXTURE_CLASSIFICATIONS = Object.freeze([
    'valid',
    'malformed',
    'tampered',
    'oversized',
    'downgraded',
    'unsupported',
] as const);

export type CapsuleFixtureClassification = (typeof CAPSULE_FIXTURE_CLASSIFICATIONS)[number];

export type CapsuleFixtureValidationLayer =
    | 'complete-contract'
    | 'manifest'
    | 'archive'
    | 'manifest-signature'
    | 'entry-commitment';

const VALIDATION_LAYERS: readonly CapsuleFixtureValidationLayer[] = [
    'complete-contract',
    'manifest',
    'archive',
    'manifest-signature',
    'entry-commitment',
];

const MUTATION_OPERATIONS = [
    'none',
    'add',
    'remove',
    'replace',
    'replace-archive-entries',
    'xor-payload-byte',
] as const;

interface JsonMutation {
    readonly operation: 'add' | 'remove' | 'replace';
    readonly path: string;
    readonly value?: unknown;
}

interface ArchiveMutation {
    readonly operation: 'replace-archive-entries';
    readonly value: readonly string[];
}

interface PayloadMutation {
    readonly operation: 'xor-payload-byte';
    readonly offset: number;
    readonly mask: number;
}

interface NoMutation {
    readonly operation: 'none';
}

export type CapsuleFixtureMutation = JsonMutation | ArchiveMutation | PayloadMutation | NoMutation;

export interface CapsuleContractFixtureCaseV1 {
    readonly id: string;
    readonly classification: CapsuleFixtureClassification;
    readonly validation_layer: CapsuleFixtureValidationLayer;
    readonly expected: 'accept' | 'reject';
    readonly mutation?: CapsuleFixtureMutation;
    readonly mutations?: readonly CapsuleFixtureMutation[];
}

export interface CapsuleContractFixtureCatalogV1 {
    readonly fixture_set: 'ctx-capsule-contract-fixtures';
    readonly version: 1;
    readonly payload_recipe: {
        readonly type: 'byte-sequence';
        readonly length: number;
        readonly modulus: number;
    };
    readonly archive_entries: readonly string[];
    readonly base_manifest: unknown;
    readonly cases: readonly CapsuleContractFixtureCaseV1[];
}

const catalog = catalogJson as unknown as CapsuleContractFixtureCatalogV1;
validateCatalog(catalog);

export const capsuleContractFixtureCatalogV1 = deepFreeze(structuredClone(catalog));

export function capsuleFixtureCaseV1(id: string): CapsuleContractFixtureCaseV1 {
    const fixtureCase = capsuleContractFixtureCatalogV1.cases.find(
        (candidate) => candidate.id === id,
    );
    if (fixtureCase === undefined) throw new Error(`Unknown Capsule contract fixture: ${id}`);
    return fixtureCase;
}

export function materializeManifestFixtureV1(id: string): unknown {
    const value = structuredClone(capsuleContractFixtureCatalogV1.base_manifest);
    for (const mutation of fixtureMutations(capsuleFixtureCaseV1(id))) {
        if (
            mutation.operation === 'add' ||
            mutation.operation === 'remove' ||
            mutation.operation === 'replace'
        ) {
            applyJsonMutation(value, mutation);
        }
    }
    return value;
}

export function archiveEntriesFixtureV1(id: string): readonly string[] {
    const mutation = fixtureMutations(capsuleFixtureCaseV1(id)).find(
        (candidate): candidate is ArchiveMutation =>
            candidate.operation === 'replace-archive-entries',
    );
    return mutation?.value ?? [...capsuleContractFixtureCatalogV1.archive_entries];
}

export function payloadBytesFixtureV1(id = 'valid-baseline'): Uint8Array {
    const { length, modulus } = capsuleContractFixtureCatalogV1.payload_recipe;
    const bytes = Uint8Array.from({ length }, (_, index) => index % modulus);
    const mutation = fixtureMutations(capsuleFixtureCaseV1(id)).find(
        (candidate): candidate is PayloadMutation => candidate.operation === 'xor-payload-byte',
    );
    if (mutation !== undefined) {
        if (mutation.offset < 0 || mutation.offset >= bytes.byteLength) {
            throw new Error(`Fixture ${id} contains an out-of-range payload offset.`);
        }
        bytes[mutation.offset] = (bytes[mutation.offset] ?? 0) ^ mutation.mask;
    }
    return bytes;
}

export function parseValidManifestFixtureV1(): CapsuleManifestV1 {
    return parseCapsuleManifest(materializeManifestFixtureV1('valid-baseline'));
}

function fixtureMutations(
    fixtureCase: CapsuleContractFixtureCaseV1,
): readonly CapsuleFixtureMutation[] {
    if (fixtureCase.mutations !== undefined) return fixtureCase.mutations;
    if (fixtureCase.mutation !== undefined) return [fixtureCase.mutation];
    return [];
}

function applyJsonMutation(target: unknown, mutation: JsonMutation): void {
    const segments = mutation.path
        .split('/')
        .slice(1)
        .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
    if (!mutation.path.startsWith('/') || segments.length === 0) {
        throw new Error(`Invalid fixture JSON Pointer: ${mutation.path}`);
    }

    let parent: unknown = target;
    for (const segment of segments.slice(0, -1)) parent = childAt(parent, segment, mutation.path);
    const key = segments.at(-1)!;

    if (Array.isArray(parent)) {
        const index = arrayIndex(key, parent.length, mutation.path);
        if (mutation.operation === 'remove') parent.splice(index, 1);
        else if (mutation.operation === 'add')
            parent.splice(index, 0, structuredClone(mutation.value));
        else parent[index] = structuredClone(mutation.value);
        return;
    }
    if (!isRecord(parent) || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`Invalid fixture mutation target: ${mutation.path}`);
    }
    if (mutation.operation === 'remove') {
        if (!(key in parent)) throw new Error(`Invalid fixture removal path: ${mutation.path}`);
        delete parent[key];
    } else {
        if (mutation.operation === 'replace' && !(key in parent)) {
            throw new Error(`Invalid fixture replacement path: ${mutation.path}`);
        }
        parent[key] = structuredClone(mutation.value);
    }
}

function childAt(parent: unknown, key: string, path: string): unknown {
    if (Array.isArray(parent)) return parent[arrayIndex(key, parent.length, path)];
    if (!isRecord(parent) || !(key in parent)) throw new Error(`Invalid fixture path: ${path}`);
    return parent[key];
}

function arrayIndex(value: string, length: number, path: string): number {
    const index = Number(value);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
        throw new Error(`Invalid fixture array index: ${path}`);
    }
    return index;
}

function validateCatalog(value: CapsuleContractFixtureCatalogV1): void {
    if (value.fixture_set !== 'ctx-capsule-contract-fixtures' || value.version !== 1) {
        throw new Error('Unsupported Capsule contract fixture catalog.');
    }
    parseCapsuleManifest(structuredClone(value.base_manifest));

    const identifiers = new Set<string>();
    const classifications = new Set<CapsuleFixtureClassification>();
    for (const fixtureCase of value.cases) {
        if (!CAPSULE_FIXTURE_CLASSIFICATIONS.includes(fixtureCase.classification)) {
            throw new Error(
                `Unknown fixture classification: ${String(fixtureCase.classification)}`,
            );
        }
        if (!VALIDATION_LAYERS.includes(fixtureCase.validation_layer)) {
            throw new Error(
                `Unknown fixture validation layer: ${String(fixtureCase.validation_layer)}`,
            );
        }
        if (fixtureCase.expected !== 'accept' && fixtureCase.expected !== 'reject') {
            throw new Error(`Unknown fixture expectation: ${String(fixtureCase.expected)}`);
        }
        if (identifiers.has(fixtureCase.id))
            throw new Error(`Duplicate fixture id: ${fixtureCase.id}`);
        identifiers.add(fixtureCase.id);
        classifications.add(fixtureCase.classification);
        if ((fixtureCase.mutation === undefined) === (fixtureCase.mutations === undefined)) {
            throw new Error(`Fixture ${fixtureCase.id} must define mutation or mutations.`);
        }
        for (const mutation of fixtureMutations(fixtureCase)) {
            if (!MUTATION_OPERATIONS.includes(mutation.operation)) {
                throw new Error(`Unknown fixture mutation: ${String(mutation.operation)}`);
            }
        }
        if (fixtureCase.classification === 'valid' && fixtureCase.expected !== 'accept') {
            throw new Error(`Valid fixture ${fixtureCase.id} must be accepted.`);
        }
        if (fixtureCase.classification !== 'valid' && fixtureCase.expected !== 'reject') {
            throw new Error(`Negative fixture ${fixtureCase.id} must be rejected.`);
        }
    }
    for (const classification of CAPSULE_FIXTURE_CLASSIFICATIONS) {
        if (!classifications.has(classification)) {
            throw new Error(`Fixture classification is not represented: ${classification}`);
        }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === 'object') {
        Object.freeze(value);
        for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
}
