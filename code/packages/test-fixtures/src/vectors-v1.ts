import vectorJson from './vectors/cryptographic-vectors-v1.json' with { type: 'json' };

if (
    vectorJson.vector_set !== 'ctx-capsule-cryptographic-vectors' ||
    vectorJson.version !== 1 ||
    !vectorJson.warning.startsWith('TEST-ONLY KEY MATERIAL')
) {
    throw new Error('Unsupported or unsafe CTX cryptographic vector set.');
}

export const cryptographicVectorsV1 = deepFreeze(structuredClone(vectorJson));

function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === 'object') {
        Object.freeze(value);
        for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
}
