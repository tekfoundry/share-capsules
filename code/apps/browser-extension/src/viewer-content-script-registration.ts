export const VIEWER_DISCOVERY_SCRIPT_ID = 'share-capsules-viewer-discovery';

export function viewerDiscoveryMatchesFromGrantedOrigins(
    origins: readonly string[],
): readonly string[] {
    return Object.freeze([...new Set(origins.filter(isViewerDiscoveryOrigin))].sort());
}

function isViewerDiscoveryOrigin(origin: string): boolean {
    if (origin === 'http://localhost/*' || origin === 'http://127.0.0.1/*') return true;
    if (!origin.startsWith('https://') || !origin.endsWith('/*')) return false;
    return !origin.includes('@');
}
