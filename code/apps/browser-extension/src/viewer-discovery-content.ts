import {
    discoverCapsuleViewerElements,
    markCapsuleViewerActionRequired,
    markCapsuleViewerDetected,
    markCapsuleViewerError,
    markCapsuleViewerOpened,
    normalizeCapsuleViewerCandidate,
    parseViewerStateMessage,
    viewerDebugEnabled,
    viewerFrameUrl,
    viewerImageFit,
} from './viewer-capsule-discovery.js';

declare const chrome: {
    readonly runtime: {
        getURL(path: string): string;
    };
};

if (window.top === window) {
    const extensionOrigin = new URL(chrome.runtime.getURL('viewer-frame.html')).origin;
    for (const element of discoverCapsuleViewerElements(document)) {
        const discovery = normalizeCapsuleViewerCandidate(
            element.getAttribute('src'),
            element.textContent ?? '',
            document.baseURI,
        );
        if (discovery === undefined) continue;
        markCapsuleViewerDetected(
            element,
            discovery,
            viewerFrameUrl(
                chrome.runtime.getURL('viewer-frame.html'),
                discovery.capsuleUrl,
                location.origin,
                viewerDebugEnabled(element),
                viewerImageFit(element),
            ),
        );
    }

    window.addEventListener('message', (event: MessageEvent<unknown>) => {
        if (event.origin !== extensionOrigin) return;
        const message = parseViewerStateMessage(event.data);
        if (message === undefined) return;
        const viewer = [...document.querySelectorAll('capsule-viewer')].find((candidate) => {
            if (!(candidate instanceof HTMLElement)) return false;
            if (candidate.dataset.shareCapsulesSrc !== message.capsuleUrl) return false;
            const frame = candidate.querySelector('[data-share-capsules-viewer-frame]');
            return frame instanceof HTMLIFrameElement && frame.contentWindow === event.source;
        });
        if (!(viewer instanceof HTMLElement)) return;
        if (message.state === 'opened') {
            markCapsuleViewerOpened(viewer, message);
            return;
        }
        if (message.state === 'error') {
            markCapsuleViewerError(viewer, message);
            return;
        }
        markCapsuleViewerActionRequired(viewer);
    });
}
