const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

export class Base64UrlError extends Error {
    public readonly code = 'invalid_base64url' as const;

    public constructor(message: string) {
        super(message);
        this.name = 'Base64UrlError';
    }
}

export function encodeBase64Url(value: Uint8Array): string {
    let binary = '';
    for (const byte of value) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function decodeBase64Url(value: string): Uint8Array {
    if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) {
        throw new Base64UrlError('Value must be unpadded base64url.');
    }

    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

    let binary: string;
    try {
        binary = atob(padded);
    } catch {
        throw new Base64UrlError('Value must be valid unpadded base64url.');
    }

    const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (encodeBase64Url(decoded) !== value) {
        throw new Base64UrlError('Value must use the canonical unpadded base64url encoding.');
    }

    return decoded;
}
