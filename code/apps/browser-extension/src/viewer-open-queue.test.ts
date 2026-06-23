import { describe, expect, it } from 'vitest';
import {
    parseViewerOpenSlotMessage,
    VIEWER_OPEN_SLOT_ACQUIRE,
    VIEWER_OPEN_SLOT_RELEASE,
    ViewerOpenSlotQueue,
    viewerOpenSlotAcquireMessage,
    viewerOpenSlotReleaseMessage,
} from './viewer-open-queue.js';

describe('ViewerOpenSlotQueue', () => {
    it('grants one opening slot at a time in request order', () => {
        const queue = new ViewerOpenSlotQueue();
        const granted: string[] = [];

        queue.acquire('viewer-open-0001', () => granted.push('first'));
        queue.acquire('viewer-open-0002', () => granted.push('second'));
        queue.acquire('viewer-open-0003', () => granted.push('third'));

        expect(granted).toEqual(['first']);
        expect(queue.release('viewer-open-0001')).toBe(true);
        expect(granted).toEqual(['first', 'second']);
        expect(queue.release('viewer-open-0002')).toBe(true);
        expect(granted).toEqual(['first', 'second', 'third']);
    });

    it('rejects release attempts from requests that do not own the active slot', () => {
        const queue = new ViewerOpenSlotQueue();
        const granted: string[] = [];

        queue.acquire('viewer-open-0001', () => granted.push('first'));
        queue.acquire('viewer-open-0002', () => granted.push('second'));

        expect(queue.release('viewer-open-0002')).toBe(false);
        expect(granted).toEqual(['first']);
    });

    it('accepts only the closed message shapes', () => {
        expect(
            parseViewerOpenSlotMessage(viewerOpenSlotAcquireMessage('viewer-open-0001')),
        ).toEqual({ type: VIEWER_OPEN_SLOT_ACQUIRE, requestId: 'viewer-open-0001' });
        expect(
            parseViewerOpenSlotMessage(viewerOpenSlotReleaseMessage('viewer-open-0001')),
        ).toEqual({ type: VIEWER_OPEN_SLOT_RELEASE, requestId: 'viewer-open-0001' });
        expect(
            parseViewerOpenSlotMessage({ type: VIEWER_OPEN_SLOT_ACQUIRE, requestId: '../x' }),
        ).toBeUndefined();
        expect(
            parseViewerOpenSlotMessage({ type: VIEWER_OPEN_SLOT_ACQUIRE, requestId: 'short' }),
        ).toBeUndefined();
    });
});
