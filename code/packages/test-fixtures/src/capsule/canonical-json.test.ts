import {
    JsonCanonicalizationError,
    MAX_CANONICAL_JSON_DEPTH,
    canonicalizeJson,
    canonicalizeJsonBytes,
} from '@sharecapsules/capsule-core';
import { describe, expect, it } from 'vitest';

describe('RFC 8785 JSON canonicalization', () => {
    it('sorts object properties recursively while preserving array order', () => {
        expect(
            canonicalizeJson({
                z: [{ y: 2, x: 1 }, 3],
                a: true,
            }),
        ).toBe('{"a":true,"z":[{"x":1,"y":2},3]}');
    });

    it('uses the RFC 8785 ECMAScript number representations', () => {
        expect(
            canonicalizeJson({
                numbers: [Number('333333333.33333329'), 1e30, 4.5, 2e-3, 1e-27, -0],
            }),
        ).toBe('{"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27,0]}');
    });

    it('uses lowercase control escapes and preserves valid Unicode scalars', () => {
        expect(canonicalizeJson({ text: '€\u000f\n"\\/' })).toBe('{"text":"€\\u000f\\n\\"\\\\/"}');
    });

    it('sorts property names by raw UTF-16 code units without locale rules', () => {
        const canonical = canonicalizeJson({
            '\ufb33': 7,
            '😀': 6,
            '€': 5,
            ö: 4,
            '\u0080': 3,
            '1': 2,
            '\r': 1,
        });

        expect(canonical).toBe('{"\\r":1,"1":2,"\u0080":3,"ö":4,"€":5,"😀":6,"דּ":7}');
    });

    it('returns the exact UTF-8 bytes used by hashes and signatures', () => {
        expect(canonicalizeJsonBytes({ currency: '€' })).toEqual(
            new TextEncoder().encode('{"currency":"€"}'),
        );
    });

    it.each([undefined, Number.NaN, Number.POSITIVE_INFINITY, 1n, Symbol('x'), () => true])(
        'rejects non-I-JSON input %#',
        (value) => {
            expect(() => canonicalizeJson(value)).toThrow(JsonCanonicalizationError);
        },
    );

    it('rejects undefined object properties instead of silently omitting signed data', () => {
        expect(() => canonicalizeJson({ signed: true, omitted: undefined })).toThrow(
            JsonCanonicalizationError,
        );
    });

    it('rejects sparse arrays instead of silently converting holes to null', () => {
        const value = [1, 2, 3];
        delete value[1];

        expect(() => canonicalizeJson(value)).toThrow(JsonCanonicalizationError);
    });

    it('rejects accessors, symbol properties, and non-plain objects', () => {
        const accessor = Object.defineProperty({}, 'value', {
            enumerable: true,
            get: () => 'hidden behavior',
        });
        const symbolProperty = { value: 1, [Symbol('extra')]: 2 };

        expect(() => canonicalizeJson(accessor)).toThrow(JsonCanonicalizationError);
        expect(() => canonicalizeJson(symbolProperty)).toThrow(JsonCanonicalizationError);
        expect(() => canonicalizeJson(new Date('2026-06-20T00:00:00Z'))).toThrow(
            JsonCanonicalizationError,
        );
    });

    it.each(['\ud800', '\udc00', `valid then lone \udfff`])(
        'rejects lone Unicode surrogate input %#',
        (value) => {
            expect(() => canonicalizeJson({ value })).toThrow(JsonCanonicalizationError);
        },
    );

    it('rejects cyclic input deterministically', () => {
        const value: Record<string, unknown> = {};
        value.self = value;

        expect(() => canonicalizeJson(value)).toThrow(JsonCanonicalizationError);
    });

    it('enforces a bounded nesting depth for untrusted input', () => {
        let value: unknown = null;
        for (let depth = 0; depth <= MAX_CANONICAL_JSON_DEPTH; depth += 1) {
            value = [value];
        }

        expect(() => canonicalizeJson(value)).toThrow(JsonCanonicalizationError);
    });
});
