import { describe, expect, it } from 'vitest';

import {
    VIEWER_DISCOVERY_SCRIPT_ID,
    viewerDiscoveryMatchesFromGrantedOrigins,
} from './viewer-content-script-registration.js';

describe('Viewer discovery content-script registration', () => {
    it('uses a stable dynamic content-script identifier', () => {
        expect(VIEWER_DISCOVERY_SCRIPT_ID).toBe('share-capsules-viewer-discovery');
    });

    it('registers only granted HTTPS and localhost development origins', () => {
        expect(
            viewerDiscoveryMatchesFromGrantedOrigins([
                'http://localhost/*',
                'http://127.0.0.1/*',
                'https://example.com/*',
                'https://example.com/*',
                'http://example.com/*',
                'http://localhost:8088/*',
                'https://user@example.com/*',
            ]),
        ).toEqual(['http://127.0.0.1/*', 'http://localhost/*', 'https://example.com/*']);
    });
});
