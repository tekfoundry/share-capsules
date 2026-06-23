export const VIEWER_OPEN_SLOT_ACQUIRE = 'share-capsules-viewer-open-slot-acquire';
export const VIEWER_OPEN_SLOT_RELEASE = 'share-capsules-viewer-open-slot-release';

export interface ViewerOpenSlotAcquireMessage {
    readonly type: typeof VIEWER_OPEN_SLOT_ACQUIRE;
    readonly requestId: string;
}

export interface ViewerOpenSlotReleaseMessage {
    readonly type: typeof VIEWER_OPEN_SLOT_RELEASE;
    readonly requestId: string;
}

export type ViewerOpenSlotMessage = ViewerOpenSlotAcquireMessage | ViewerOpenSlotReleaseMessage;

export interface ViewerOpenSlotAcquireResponse {
    readonly granted: true;
}

export interface ViewerOpenSlotReleaseResponse {
    readonly released: boolean;
}

export class ViewerOpenSlotQueue {
    private activeRequestId: string | undefined;
    private readonly waiting: {
        readonly requestId: string;
        readonly grant: () => void;
    }[] = [];

    public acquire(requestId: string, grant: () => void): void {
        if (this.activeRequestId === undefined) {
            this.activeRequestId = requestId;
            grant();
            return;
        }

        this.waiting.push({ requestId, grant });
    }

    public release(requestId: string): boolean {
        if (this.activeRequestId !== requestId) return false;
        this.activeRequestId = undefined;
        const next = this.waiting.shift();
        if (next !== undefined) {
            this.activeRequestId = next.requestId;
            next.grant();
        }

        return true;
    }
}

export function viewerOpenSlotAcquireMessage(requestId: string): ViewerOpenSlotAcquireMessage {
    return { type: VIEWER_OPEN_SLOT_ACQUIRE, requestId };
}

export function viewerOpenSlotReleaseMessage(requestId: string): ViewerOpenSlotReleaseMessage {
    return { type: VIEWER_OPEN_SLOT_RELEASE, requestId };
}

export function parseViewerOpenSlotMessage(value: unknown): ViewerOpenSlotMessage | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    if (
        (record.type === VIEWER_OPEN_SLOT_ACQUIRE || record.type === VIEWER_OPEN_SLOT_RELEASE) &&
        typeof record.requestId === 'string' &&
        /^[a-z0-9_-]{16,80}$/u.test(record.requestId)
    ) {
        return record.type === VIEWER_OPEN_SLOT_ACQUIRE
            ? viewerOpenSlotAcquireMessage(record.requestId)
            : viewerOpenSlotReleaseMessage(record.requestId);
    }

    return undefined;
}
