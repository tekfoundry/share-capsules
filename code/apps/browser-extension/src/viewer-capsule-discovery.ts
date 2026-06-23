export interface ViewerCapsuleDiscovery {
    readonly capsuleUrl: string;
    readonly fallbackText: string;
}

export function normalizeCapsuleViewerCandidate(
    rawSource: string | null,
    fallbackText: string,
    baseUrl: string,
): ViewerCapsuleDiscovery | undefined {
    if (rawSource === null || rawSource.trim() === '') return undefined;
    let url: URL;
    try {
        url = new URL(rawSource, baseUrl);
    } catch {
        return undefined;
    }
    if (!isSupportedCapsuleUrl(url)) return undefined;

    return Object.freeze({
        capsuleUrl: url.href,
        fallbackText: normalizeFallbackText(fallbackText),
    });
}

export function isSupportedCapsuleUrl(url: URL): boolean {
    if (url.username !== '' || url.password !== '') return false;
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && isLocalDevelopmentHost(url.hostname);
}

export function discoverCapsuleViewerElements(document: Document): readonly HTMLElement[] {
    return Object.freeze(
        [...document.querySelectorAll('capsule-viewer')].filter(
            (element): element is HTMLElement =>
                element instanceof HTMLElement && isDiscoverableElement(element),
        ),
    );
}

export function markCapsuleViewerDetected(
    element: HTMLElement,
    discovery: ViewerCapsuleDiscovery,
): void {
    if (element.querySelector('[data-share-capsules-viewer-status]') !== null) return;
    element.dataset.shareCapsulesState = 'detected';
    element.dataset.shareCapsulesSrc = discovery.capsuleUrl;
    element.setAttribute('data-share-capsules-discovered', 'true');
    element.append(viewerStatusElement(element.ownerDocument));
}

function viewerStatusElement(document: Document): HTMLElement {
    const status = document.createElement('div');
    status.setAttribute('data-share-capsules-viewer-status', 'detected');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Capsule detected. Viewer support is not active yet.';
    status.style.marginTop = '0.75rem';
    status.style.padding = '0.75rem';
    status.style.border = '1px solid #b9c9e1';
    status.style.borderRadius = '0.75rem';
    status.style.background = '#f8fafc';
    status.style.color = '#526078';
    status.style.font = '14px system-ui, sans-serif';
    return status;
}

function isDiscoverableElement(element: HTMLElement): boolean {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    const view = element.ownerDocument.defaultView;
    const style = view?.getComputedStyle(element);
    if (
        style !== undefined &&
        (style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.contentVisibility === 'hidden')
    ) {
        return false;
    }
    return element.getClientRects().length > 0;
}

function normalizeFallbackText(value: string): string {
    return value.replace(/\s+/gu, ' ').trim().slice(0, 1000);
}

function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
