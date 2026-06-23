import type { ContentInspection } from './creator-content-profile.js';

export interface CreatorStudioDraftV1 {
    readonly version: 1;
    readonly description: {
        readonly title: string;
        readonly description?: string;
    };
    readonly fallback: {
        readonly alt_text: string;
    };
    readonly policy: {
        readonly access_window?: {
            readonly not_before?: string;
            readonly not_after?: string;
        };
        readonly capsule_lifetime_maximum?: number;
        readonly account_capsule_lifetime_maximum?: number;
        readonly automation_risk_required: boolean;
    };
}

export interface LocalCreatorSource {
    readonly name: string;
    readonly size: number;
    readonly mediaType: string;
}

export interface CreatorSourcePicker<TSource extends LocalCreatorSource> {
    choose(): Promise<TSource | undefined>;
}

export interface CreatorStudioViewModel {
    readonly status:
        | 'ready'
        | 'choosing-file'
        | 'validating-file'
        | 'file-invalid'
        | 'file-selected';
    readonly title: string;
    readonly description?: string;
    readonly accessSummary: string;
    readonly totalLimitSummary: string;
    readonly accountLimitSummary: string;
    readonly automationRiskSummary: string;
    readonly sourceIssue?: string;
    readonly selectedFile?: {
        readonly name: string;
        readonly size: number;
        readonly mediaType: string;
    };
}

export interface CreatorSourceInspector<TSource, TMetadata> {
    inspect(source: TSource): Promise<ContentInspection<TMetadata>>;
}

export interface CreatorStudioRenderer {
    render(model: CreatorStudioViewModel): void;
}

export class CreatorStudioDraftError extends Error {
    public constructor() {
        super('The Creator Studio draft is invalid.');
        this.name = 'CreatorStudioDraftError';
    }
}

export class CreatorStudioSurface<TSource extends LocalCreatorSource, TMetadata = unknown> {
    private source?: TSource;
    private metadata?: TMetadata;
    private sourceIssue?: string;
    private choosing = false;

    public constructor(
        private readonly draft: CreatorStudioDraftV1,
        private readonly picker: CreatorSourcePicker<TSource>,
        private readonly renderer: CreatorStudioRenderer,
        private readonly inspector?: CreatorSourceInspector<TSource, TMetadata>,
    ) {}

    public start(): void {
        this.render('ready');
    }

    public async chooseSource(): Promise<void> {
        if (this.choosing) return;
        this.choosing = true;
        this.render('choosing-file');

        try {
            const selected = await this.picker.choose();
            if (selected !== undefined) {
                this.source = undefined;
                this.metadata = undefined;
                this.sourceIssue = undefined;
                if (this.inspector === undefined) {
                    this.source = selected;
                } else {
                    this.render('validating-file');
                    try {
                        const inspection = await this.inspector.inspect(selected);
                        if (inspection.valid) {
                            this.source = selected;
                            this.metadata = inspection.metadata;
                        } else {
                            this.sourceIssue =
                                inspection.issues[0]?.message ??
                                'The selected file is not supported.';
                        }
                    } catch {
                        this.sourceIssue =
                            'The selected file could not be checked. Please choose it again.';
                    }
                }
            }
        } finally {
            this.choosing = false;
            this.render(
                this.source !== undefined
                    ? 'file-selected'
                    : this.sourceIssue === undefined
                      ? 'ready'
                      : 'file-invalid',
            );
        }
    }

    public selectedSource(): TSource | undefined {
        return this.source;
    }

    public selectedMetadata(): TMetadata | undefined {
        return this.metadata;
    }

    public draftValue(): CreatorStudioDraftV1 {
        return this.draft;
    }

    private render(status: CreatorStudioViewModel['status']): void {
        this.renderer.render({
            status,
            title: this.draft.description.title,
            ...(this.draft.description.description === undefined
                ? {}
                : { description: this.draft.description.description }),
            accessSummary: accessSummary(this.draft.policy.access_window),
            totalLimitSummary:
                this.draft.policy.capsule_lifetime_maximum === undefined
                    ? 'No total opening limit'
                    : `${this.draft.policy.capsule_lifetime_maximum} total openings`,
            accountLimitSummary:
                this.draft.policy.account_capsule_lifetime_maximum === undefined
                    ? 'No per-account opening limit'
                    : `${this.draft.policy.account_capsule_lifetime_maximum} openings per user account`,
            automationRiskSummary: this.draft.policy.automation_risk_required
                ? 'Automation protection on'
                : 'Automation protection off',
            ...(this.sourceIssue === undefined ? {} : { sourceIssue: this.sourceIssue }),
            ...(this.source === undefined
                ? {}
                : {
                      selectedFile: {
                          name: this.source.name,
                          size: this.source.size,
                          mediaType: this.source.mediaType,
                      },
                  }),
        });
    }
}

export function parseCreatorStudioDraftV1(value: unknown): CreatorStudioDraftV1 {
    const parsed: unknown = typeof value === 'string' ? parseJson(value) : value;
    const root = record(parsed, ['description', 'fallback', 'policy', 'version']);
    if (root.version !== 1) throw new CreatorStudioDraftError();

    const description = record(root.description, ['description', 'title'], ['description']);
    const title = boundedText(description.title, 1, 200);
    const detail =
        description.description === undefined
            ? undefined
            : boundedText(description.description, 1, 1000);

    const fallback = record(root.fallback, ['alt_text']);
    const altText = boundedText(fallback.alt_text, 1, 1000);
    if (altText !== (detail ?? title)) throw new CreatorStudioDraftError();

    const policy = record(
        root.policy,
        [
            'access_window',
            'account_capsule_lifetime_maximum',
            'automation_risk_required',
            'capsule_lifetime_maximum',
        ],
        ['access_window', 'account_capsule_lifetime_maximum', 'capsule_lifetime_maximum'],
    );
    if (typeof policy.automation_risk_required !== 'boolean') {
        throw new CreatorStudioDraftError();
    }
    const total = optionalLimit(policy.capsule_lifetime_maximum);
    const account = optionalLimit(policy.account_capsule_lifetime_maximum);
    if (total !== undefined && account !== undefined && total < account) {
        throw new CreatorStudioDraftError();
    }
    const window = optionalAccessWindow(policy.access_window);

    return Object.freeze({
        version: 1,
        description: Object.freeze({
            title,
            ...(detail === undefined ? {} : { description: detail }),
        }),
        fallback: Object.freeze({ alt_text: altText }),
        policy: Object.freeze({
            ...(window === undefined ? {} : { access_window: window }),
            ...(total === undefined ? {} : { capsule_lifetime_maximum: total }),
            ...(account === undefined ? {} : { account_capsule_lifetime_maximum: account }),
            automation_risk_required: policy.automation_risk_required,
        }),
    });
}

function optionalAccessWindow(value: unknown): CreatorStudioDraftV1['policy']['access_window'] {
    if (value === undefined) return undefined;
    const window = record(value, ['not_after', 'not_before'], ['not_after', 'not_before']);
    if (window.not_before === undefined && window.not_after === undefined) {
        throw new CreatorStudioDraftError();
    }
    const notBefore = optionalInstant(window.not_before);
    const notAfter = optionalInstant(window.not_after);
    if (
        notBefore !== undefined &&
        notAfter !== undefined &&
        Date.parse(notBefore) >= Date.parse(notAfter)
    ) {
        throw new CreatorStudioDraftError();
    }

    return Object.freeze({
        ...(notBefore === undefined ? {} : { not_before: notBefore }),
        ...(notAfter === undefined ? {} : { not_after: notAfter }),
    });
}

function accessSummary(window: CreatorStudioDraftV1['policy']['access_window']): string {
    if (window === undefined) return 'Can be opened at any time';
    if (window.not_before !== undefined && window.not_after !== undefined) {
        return `Can be opened from ${localDate(window.not_before)} through ${localClosingDate(window.not_after)}`;
    }
    if (window.not_before !== undefined)
        return `Can be opened starting ${localDate(window.not_before)}`;

    if (window.not_after !== undefined) {
        return `Can be opened through ${localClosingDate(window.not_after)}`;
    }

    throw new CreatorStudioDraftError();
}

function localDate(value: string): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function localClosingDate(value: string): string {
    const instant = new Date(value);
    instant.setMilliseconds(instant.getMilliseconds() - 1);
    return localDate(instant.toISOString());
}

function parseJson(value: string): unknown {
    try {
        return JSON.parse(value) as unknown;
    } catch {
        throw new CreatorStudioDraftError();
    }
}

function record(
    value: unknown,
    allowed: readonly string[],
    optional: readonly string[] = [],
): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new CreatorStudioDraftError();
    }
    const result = value as Record<string, unknown>;
    const keys = Object.keys(result).sort();
    const allowedSet = new Set(allowed);
    if (keys.some((key) => !allowedSet.has(key))) throw new CreatorStudioDraftError();
    for (const key of allowed) {
        if (!optional.includes(key) && !(key in result)) throw new CreatorStudioDraftError();
    }

    return result;
}

function boundedText(value: unknown, minimum: number, maximum: number): string {
    if (
        typeof value !== 'string' ||
        value.length < minimum ||
        value.length > maximum ||
        value.trim() !== value
    ) {
        throw new CreatorStudioDraftError();
    }

    return value;
}

function optionalLimit(value: unknown): number | undefined {
    if (value === undefined) return undefined;
    if (!Number.isSafeInteger(value) || (value as number) < 1) throw new CreatorStudioDraftError();

    return value as number;
}

function optionalInstant(value: unknown): string | undefined {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
        throw new CreatorStudioDraftError();
    }
    const milliseconds = Date.parse(value);
    if (
        !Number.isFinite(milliseconds) ||
        new Date(milliseconds).toISOString().replace('.000Z', 'Z') !== value
    ) {
        throw new CreatorStudioDraftError();
    }

    return value;
}
