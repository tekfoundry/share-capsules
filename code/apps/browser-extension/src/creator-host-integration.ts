export interface CreatorHostIntegrationInputV1 {
    readonly capsuleUrl: string;
    readonly fallbackText: string;
}

export interface CreatorHostIntegrationV1 {
    readonly version: 1;
    readonly capsuleUrl: string;
    readonly fallbackText: string;
    readonly markup: string;
}

export class CreatorHostIntegrationError extends Error {
    public constructor(public readonly field: 'capsule_url' | 'fallback_text') {
        super(`The ${field} value is invalid.`);
        this.name = 'CreatorHostIntegrationError';
    }
}

export function createCreatorHostIntegrationV1(
    input: CreatorHostIntegrationInputV1,
): CreatorHostIntegrationV1 {
    const capsuleUrl = validateCapsuleUrl(input.capsuleUrl);
    const fallbackText = validateFallbackText(input.fallbackText);
    const markup = `<capsule-viewer src="${escapeAttribute(capsuleUrl)}">
  <p>${escapeText(fallbackText)}</p>
</capsule-viewer>`;

    return Object.freeze({ version: 1, capsuleUrl, fallbackText, markup });
}

export function exampleCapsuleUrlForFilename(filename: string): string {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,79})\.capsule$/u.test(filename)) {
        throw new CreatorHostIntegrationError('capsule_url');
    }

    return `https://example.com/capsules/${filename}`;
}

function validateCapsuleUrl(value: string): string {
    if (value.trim() !== value || value.length > 2048) {
        throw new CreatorHostIntegrationError('capsule_url');
    }
    try {
        const url = new URL(value);
        if (
            url.protocol !== 'https:' ||
            url.username !== '' ||
            url.password !== '' ||
            url.search !== '' ||
            url.hash !== ''
        ) {
            throw new Error('unsafe URL');
        }
        return url.href;
    } catch {
        throw new CreatorHostIntegrationError('capsule_url');
    }
}

function validateFallbackText(value: string): string {
    if (
        value.length < 1 ||
        value.length > 1000 ||
        value.trim() !== value ||
        hasForbiddenControl(value)
    ) {
        throw new CreatorHostIntegrationError('fallback_text');
    }
    return value;
}

function hasForbiddenControl(value: string): boolean {
    return [...value].some((character) => {
        const point = character.codePointAt(0)!;
        return (
            (point >= 0 && point <= 8) ||
            point === 11 ||
            point === 12 ||
            (point >= 14 && point <= 31) ||
            point === 127
        );
    });
}

function escapeAttribute(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function escapeText(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
