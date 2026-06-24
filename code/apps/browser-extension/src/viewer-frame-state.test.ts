import { describe, expect, it } from 'vitest';

import { viewerFrameStateView } from './viewer-frame-state.js';

describe('Viewer frame state view', () => {
    it('marks in-progress states as busy without changing the locked heading', () => {
        expect(viewerFrameStateView('loading')).toEqual({
            heading: 'Capsule locked',
            ariaBusy: 'true',
            className: '',
        });
    });

    it('marks user-action and error blockers as stable locked states', () => {
        expect(viewerFrameStateView('action_required')).toEqual({
            heading: 'Capsule locked',
            ariaBusy: 'false',
            className: '',
        });
        expect(viewerFrameStateView('error')).toEqual({
            heading: 'Capsule locked',
            ariaBusy: 'false',
            className: '',
        });
    });

    it('switches opened Capsules into the content-only rendering state', () => {
        expect(viewerFrameStateView('opened')).toEqual({
            heading: 'Capsule opened',
            ariaBusy: 'false',
            className: 'is-open',
        });
    });
});
