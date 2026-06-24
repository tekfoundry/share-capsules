export type ViewerFrameState = 'loading' | 'action_required' | 'error' | 'opened';

export interface ViewerFrameStateView {
    readonly heading: 'Capsule locked' | 'Capsule opened';
    readonly ariaBusy: 'true' | 'false';
    readonly className: 'is-open' | '';
}

export function viewerFrameStateView(state: ViewerFrameState): ViewerFrameStateView {
    if (state === 'opened') {
        return {
            heading: 'Capsule opened',
            ariaBusy: 'false',
            className: 'is-open',
        };
    }

    return {
        heading: 'Capsule locked',
        ariaBusy: state === 'loading' ? 'true' : 'false',
        className: '',
    };
}
