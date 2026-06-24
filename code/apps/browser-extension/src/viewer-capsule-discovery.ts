export interface ViewerCapsuleDiscovery {
    readonly capsuleUrl: string;
    readonly fallbackText: string;
    readonly debug: boolean;
}

export type ViewerImageFit = 'contain' | 'cover' | 'fill' | 'full-height' | 'scale-down';
export const VIEWER_STATE_MESSAGE = 'share-capsules-viewer-state';

export interface ViewerStateMessage {
    readonly type: typeof VIEWER_STATE_MESSAGE;
    readonly state: 'action_required' | 'opened' | 'error';
    readonly capsuleUrl: string;
    readonly title?: string;
    readonly description?: string;
    readonly errorMessage?: string;
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
        debug: false,
    });
}

export function viewerDebugEnabled(element: HTMLElement): boolean {
    const value = element.getAttribute('debug');
    return (
        value !== null &&
        value.toLowerCase() !== 'false' &&
        value !== '0' &&
        value.toLowerCase() !== 'off'
    );
}

export function viewerImageFit(element: HTMLElement): ViewerImageFit {
    const value = (element.getAttribute('fit') ?? element.getAttribute('image-fit'))?.toLowerCase();
    return value === 'cover' ||
        value === 'fill' ||
        value === 'full-height' ||
        value === 'scale-down'
        ? value
        : 'contain';
}

export function viewerHeight(element: HTMLElement): string | undefined {
    const value = element.getAttribute('viewer-height')?.trim();
    if (value === undefined || value === '') return undefined;
    return /^([1-9]\d{0,3})(px|rem|em|vh|vw)$/u.test(value) ? value : undefined;
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
                element instanceof HTMLElement && isDiscoverableCapsuleViewerElement(element),
        ),
    );
}

export function isDiscoverableCapsuleViewerElement(element: HTMLElement): boolean {
    return element.localName.toLowerCase() === 'capsule-viewer';
}

export function markCapsuleViewerDetected(
    element: HTMLElement,
    discovery: ViewerCapsuleDiscovery,
    viewerFrameUrl: string,
): void {
    if (element.querySelector('[data-share-capsules-viewer-frame]') !== null) return;
    element.dataset.shareCapsulesState = 'detected';
    element.dataset.shareCapsulesSrc = discovery.capsuleUrl;
    element.setAttribute('data-share-capsules-discovered', 'true');
    element.append(
        hiddenViewerFrameElement(element.ownerDocument, viewerFrameUrl, viewerHeight(element)),
    );
}

export function markCapsuleViewerActionRequired(element: HTMLElement): void {
    const frame = viewerFrame(element);
    if (frame === undefined) return;
    element.dataset.shareCapsulesState = 'action-required';
    for (const child of element.children) {
        if (child === frame) {
            showStandaloneViewerFrame(frame);
            continue;
        }
        if (child instanceof HTMLElement) child.hidden = true;
    }
}

export function markCapsuleViewerOpened(element: HTMLElement, message: ViewerStateMessage): void {
    const frame = viewerFrame(element);
    if (frame === undefined) return;
    element.dataset.shareCapsulesState = 'opened';
    const template = element.querySelector(':scope > template');
    if (template instanceof HTMLTemplateElement) {
        const content = template.content.cloneNode(true);
        if (content instanceof DocumentFragment) {
            replaceTextPlaceholders(content, message);
            const placeholder = content.querySelector('content');
            if (placeholder instanceof HTMLElement) {
                moveFrameIntoPlaceholder(frame, placeholder);
                placeholder.replaceWith(frame);
            } else {
                showStandaloneViewerFrame(frame);
                content.append(frame);
            }
            element.replaceChildren(content);
            return;
        }
    }

    for (const child of element.children) {
        if (
            child instanceof HTMLIFrameElement &&
            child.dataset.shareCapsulesViewerFrame !== undefined
        ) {
            showStandaloneViewerFrame(child);
            continue;
        }
        if (child instanceof HTMLElement) child.hidden = true;
    }
}

export function markCapsuleViewerError(element: HTMLElement, message: ViewerStateMessage): void {
    const error = element.querySelector(':scope > error');
    if (!(error instanceof HTMLElement)) {
        markCapsuleViewerActionRequired(element);
        return;
    }
    element.dataset.shareCapsulesState = 'error';
    const content = element.ownerDocument.createDocumentFragment();
    for (const child of [...error.childNodes]) {
        content.append(child.cloneNode(true));
    }
    replaceTextPlaceholders(content, message);
    element.replaceChildren(content);
}

export function viewerStateMessage(
    capsuleUrl: string,
    state: ViewerStateMessage['state'] = 'opened',
    metadata: Omit<ViewerStateMessage, 'type' | 'state' | 'capsuleUrl'> = {},
): ViewerStateMessage {
    return {
        type: VIEWER_STATE_MESSAGE,
        state,
        capsuleUrl,
        ...metadata,
    };
}

export function parseViewerStateMessage(value: unknown): ViewerStateMessage | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    if (
        record.type !== VIEWER_STATE_MESSAGE ||
        !isViewerState(record.state) ||
        typeof record.capsuleUrl !== 'string'
    ) {
        return undefined;
    }

    return viewerStateMessage(record.capsuleUrl, record.state, {
        title: typeof record.title === 'string' ? record.title : undefined,
        description: typeof record.description === 'string' ? record.description : undefined,
        errorMessage: typeof record.errorMessage === 'string' ? record.errorMessage : undefined,
    });
}

export function viewerFrameUrl(
    viewerFramePageUrl: string,
    capsuleUrl: string,
    siteOrigin: string,
    debug = false,
    imageFit: ViewerImageFit = 'contain',
): string {
    const url = new URL(viewerFramePageUrl);
    url.searchParams.set('capsule', capsuleUrl);
    url.searchParams.set('site', siteOrigin);
    if (debug) url.searchParams.set('debug', '1');
    if (imageFit !== 'contain') url.searchParams.set('image_fit', imageFit);
    return url.href;
}

function hiddenViewerFrameElement(
    document: Document,
    frameUrl: string,
    height: string | undefined,
): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.setAttribute('data-share-capsules-viewer-frame', 'loading');
    if (height !== undefined) frame.dataset.shareCapsulesViewerHeight = height;
    frame.title = 'Share Capsules Viewer';
    frame.src = frameUrl;
    frame.loading = 'eager';
    frame.referrerPolicy = 'no-referrer';
    frame.style.position = 'absolute';
    frame.style.width = '1px';
    frame.style.height = '1px';
    frame.style.opacity = '0';
    frame.style.pointerEvents = 'none';
    frame.style.border = '0';
    return frame;
}

function viewerFrame(element: HTMLElement): HTMLIFrameElement | undefined {
    const frame = element.querySelector('[data-share-capsules-viewer-frame]');
    return frame instanceof HTMLIFrameElement ? frame : undefined;
}

function showStandaloneViewerFrame(frame: HTMLIFrameElement): void {
    frame.dataset.shareCapsulesViewerFrame = 'visible';
    frame.removeAttribute('class');
    frame.style.cssText = '';
    frame.style.display = 'block';
    frame.style.width = '100%';
    const height = frame.dataset.shareCapsulesViewerHeight;
    if (height === undefined) {
        frame.style.minHeight = '19rem';
    } else {
        frame.style.height = height;
    }
    frame.style.marginTop = '0.75rem';
    frame.style.border = '0';
    frame.style.background = 'transparent';
    frame.style.opacity = '1';
    frame.style.pointerEvents = 'auto';
}

function moveFrameIntoPlaceholder(frame: HTMLIFrameElement, placeholder: HTMLElement): void {
    frame.dataset.shareCapsulesViewerFrame = 'opened';
    frame.className = placeholder.className;
    frame.style.cssText = placeholder.style.cssText;
    frame.style.border = '0';
    frame.style.opacity = '1';
    frame.style.pointerEvents = 'auto';
    frame.style.background = frame.style.background || 'transparent';
}

function replaceTextPlaceholders(root: ParentNode, message: ViewerStateMessage): void {
    const values = {
        title: message.title ?? 'Capsule',
        description: message.description ?? '',
        error_message: message.errorMessage ?? 'This Capsule could not be opened.',
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node !== null) {
        node.textContent = (node.textContent ?? '').replace(
            /\{\{\s*(title|description|error_message)\s*\}\}/gu,
            (_, key: keyof typeof values) => values[key],
        );
        node = walker.nextNode();
    }
}

function isViewerState(value: unknown): value is ViewerStateMessage['state'] {
    return value === 'action_required' || value === 'opened' || value === 'error';
}

function normalizeFallbackText(value: string): string {
    return value.replace(/\s+/gu, ' ').trim().slice(0, 1000);
}

function isLocalDevelopmentHost(hostname: string): boolean {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
