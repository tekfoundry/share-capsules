import canonicalize from 'canonicalize';

export const MAX_CANONICAL_JSON_DEPTH = 64 as const;

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export class JsonCanonicalizationError extends Error {
    public readonly code = 'invalid_canonical_json_input' as const;

    public constructor(
        public readonly path: string,
        message: string,
    ) {
        super(message);
        this.name = 'JsonCanonicalizationError';
    }
}

export function canonicalizeJson(value: unknown): string {
    assertIJsonValue(value, '$', 0, new Set<object>());

    const result = canonicalize(value);
    if (typeof result !== 'string') {
        throw new JsonCanonicalizationError('$', 'Input must produce a JSON value.');
    }

    return result;
}

export function canonicalizeJsonBytes(value: unknown): Uint8Array {
    return new TextEncoder().encode(canonicalizeJson(value));
}

function assertIJsonValue(
    value: unknown,
    path: string,
    depth: number,
    ancestors: Set<object>,
): asserts value is JsonValue {
    if (depth > MAX_CANONICAL_JSON_DEPTH) {
        throw new JsonCanonicalizationError(path, 'Input exceeds the maximum nesting depth.');
    }

    if (value === null || typeof value === 'boolean') {
        return;
    }

    if (typeof value === 'string') {
        assertValidUnicodeScalarSequence(value, path);
        return;
    }

    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new JsonCanonicalizationError(path, 'Numbers must be finite IEEE 754 values.');
        }
        return;
    }

    if (typeof value !== 'object') {
        throw new JsonCanonicalizationError(path, 'Input contains a non-JSON value.');
    }

    if (ancestors.has(value)) {
        throw new JsonCanonicalizationError(path, 'Input contains a cyclic reference.');
    }

    ancestors.add(value);
    try {
        if (Array.isArray(value)) {
            assertIJsonArray(value, path, depth, ancestors);
            return;
        }

        assertIJsonObject(value, path, depth, ancestors);
    } finally {
        ancestors.delete(value);
    }
}

function assertIJsonArray(
    value: unknown[],
    path: string,
    depth: number,
    ancestors: Set<object>,
): void {
    const propertyNames = Object.getOwnPropertyNames(value);
    const expectedProperties = new Set(['length', ...value.map((_, index) => String(index))]);

    if (propertyNames.some((propertyName) => !expectedProperties.has(propertyName))) {
        throw new JsonCanonicalizationError(path, 'Arrays must not contain named properties.');
    }

    if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new JsonCanonicalizationError(path, 'Arrays must not contain symbol properties.');
    }

    for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
            throw new JsonCanonicalizationError(`${path}[${index}]`, 'Arrays must not be sparse.');
        }

        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            throw new JsonCanonicalizationError(
                `${path}[${index}]`,
                'Array values must be enumerable data properties.',
            );
        }

        assertIJsonValue(descriptor.value, `${path}[${index}]`, depth + 1, ancestors);
    }
}

function assertIJsonObject(
    value: object,
    path: string,
    depth: number,
    ancestors: Set<object>,
): void {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        throw new JsonCanonicalizationError(path, 'Objects must be plain JSON objects.');
    }

    if (Object.getOwnPropertySymbols(value).length > 0) {
        throw new JsonCanonicalizationError(path, 'Objects must not contain symbol properties.');
    }

    for (const propertyName of Object.getOwnPropertyNames(value)) {
        assertValidUnicodeScalarSequence(propertyName, path);

        const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
            throw new JsonCanonicalizationError(
                propertyPath(path, propertyName),
                'Object values must be enumerable data properties.',
            );
        }

        assertIJsonValue(descriptor.value, propertyPath(path, propertyName), depth + 1, ancestors);
    }
}

function assertValidUnicodeScalarSequence(value: string, path: string): void {
    for (let index = 0; index < value.length; index += 1) {
        const codeUnit = value.charCodeAt(index);

        if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
            const nextCodeUnit = value.charCodeAt(index + 1);
            if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) {
                throw new JsonCanonicalizationError(
                    path,
                    'Strings must not contain lone surrogates.',
                );
            }
            index += 1;
            continue;
        }

        if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
            throw new JsonCanonicalizationError(path, 'Strings must not contain lone surrogates.');
        }
    }
}

function propertyPath(parent: string, propertyName: string): string {
    return `${parent}/${propertyName.replaceAll('~', '~0').replaceAll('/', '~1')}`;
}
