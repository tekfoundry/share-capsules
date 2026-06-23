import {
    discoverCapsuleViewerElements,
    markCapsuleViewerDetected,
    normalizeCapsuleViewerCandidate,
} from './viewer-capsule-discovery.js';

if (window.top === window) {
    for (const element of discoverCapsuleViewerElements(document)) {
        const discovery = normalizeCapsuleViewerCandidate(
            element.getAttribute('src'),
            element.textContent ?? '',
            document.baseURI,
        );
        if (discovery === undefined) continue;
        markCapsuleViewerDetected(element, discovery);
    }
}
