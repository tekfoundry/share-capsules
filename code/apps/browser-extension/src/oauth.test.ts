import { describe, expect, it } from 'vitest';

import {
    ExtensionOAuthClient,
    ExtensionOAuthError,
    type ExtensionIdentityFlow,
    type ExtensionOAuthConfiguration,
    type OAuthTokenTransport,
} from './oauth.js';

const configuration: ExtensionOAuthConfiguration = {
    issuer: 'https://sharecapsules.test',
    authorizationEndpoint: 'https://sharecapsules.test/oauth/authorize',
    tokenEndpoint: 'https://sharecapsules.test/oauth/token',
    clientId: '01977ac8-793e-72d4-a234-bd581e773e7d',
    redirectUri: 'https://abcdefghijklmnop.chromiumapp.org/oauth/callback',
    scopes: ['extension:connect'],
};

class RecordingTransport implements OAuthTokenTransport {
    public calls: Array<{ endpoint: string; parameters: URLSearchParams }> = [];

    public constructor(private readonly response: unknown = validTokenResponse()) {}

    public async exchange(endpoint: string, parameters: URLSearchParams): Promise<unknown> {
        this.calls.push({ endpoint, parameters });
        return this.response;
    }
}

class CallbackIdentity implements ExtensionIdentityFlow {
    public authorizationUrl?: URL;

    public constructor(
        private readonly callback: (authorizationUrl: URL) => string = successfulCallback,
    ) {}

    public async launchWebAuthFlow(authorizationUrl: string): Promise<string> {
        this.authorizationUrl = new URL(authorizationUrl);
        return this.callback(this.authorizationUrl);
    }
}

describe('extension OAuth Authorization Code with PKCE', () => {
    it('uses a public S256 request with explicit consent and exchanges no client secret', async () => {
        const identity = new CallbackIdentity();
        const transport = new RecordingTransport();
        const client = new ExtensionOAuthClient(configuration, identity, transport);

        const tokens = await client.connect();

        expect(identity.authorizationUrl?.searchParams.get('code_challenge_method')).toBe('S256');
        expect(identity.authorizationUrl?.searchParams.get('code_challenge')).toMatch(
            /^[A-Za-z0-9_-]{43}$/u,
        );
        expect(identity.authorizationUrl?.searchParams.get('prompt')).toBe('consent');
        expect(identity.authorizationUrl?.searchParams.get('scope')).toBe('extension:connect');
        expect(identity.authorizationUrl?.searchParams.get('state')).toMatch(
            /^[A-Za-z0-9_-]{43}$/u,
        );
        expect(transport.calls).toHaveLength(1);
        expect(transport.calls[0]?.parameters.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{86}$/u);
        expect(transport.calls[0]?.parameters.has('client_secret')).toBe(false);
        expect(tokens).toEqual({
            accessToken: 'access-token',
            tokenType: 'Bearer',
            expiresIn: 600,
            scopes: ['extension:connect'],
        });
    });

    it('rejects a callback with the wrong state before token exchange', async () => {
        const transport = new RecordingTransport();
        const identity = new CallbackIdentity(
            () => `${configuration.redirectUri}?code=authorization-code&state=wrong`,
        );

        await expect(
            new ExtensionOAuthClient(configuration, identity, transport).connect(),
        ).rejects.toMatchObject({ code: 'state_mismatch' });
        expect(transport.calls).toHaveLength(0);
    });

    it('rejects a callback delivered to any unregistered origin or path', async () => {
        const transport = new RecordingTransport();
        const identity = new CallbackIdentity(
            (url) =>
                `https://attacker.example/oauth/callback?code=authorization-code&state=${url.searchParams.get('state')}`,
        );

        await expect(
            new ExtensionOAuthClient(configuration, identity, transport).connect(),
        ).rejects.toMatchObject({ code: 'callback_mismatch' });
        expect(transport.calls).toHaveLength(0);
    });

    it('maps a denied consent response to a stable error', async () => {
        const identity = new CallbackIdentity(
            (url) =>
                `${configuration.redirectUri}?error=access_denied&state=${url.searchParams.get('state')}`,
        );

        await expect(
            new ExtensionOAuthClient(configuration, identity, new RecordingTransport()).connect(),
        ).rejects.toMatchObject({ code: 'authorization_denied' });
    });

    it('rejects malformed token responses', async () => {
        const client = new ExtensionOAuthClient(
            configuration,
            new CallbackIdentity(),
            new RecordingTransport({ access_token: 'missing-other-fields' }),
        );

        await expect(client.connect()).rejects.toMatchObject({ code: 'invalid_token_response' });
    });

    it('fails closed when an endpoint is not HTTPS', () => {
        expect(
            () =>
                new ExtensionOAuthClient(
                    { ...configuration, tokenEndpoint: 'http://sharecapsules.test/oauth/token' },
                    new CallbackIdentity(),
                    new RecordingTransport(),
                ),
        ).toThrow(new ExtensionOAuthError('invalid_configuration'));
    });

    it('allows HTTP only for local development loopback endpoints', async () => {
        const local = {
            ...configuration,
            issuer: 'http://localhost:3003',
            authorizationEndpoint: 'http://localhost:3003/oauth/authorize',
            tokenEndpoint: 'http://localhost:3003/oauth/token',
        };

        await expect(
            new ExtensionOAuthClient(
                local,
                new CallbackIdentity(),
                new RecordingTransport(),
            ).connect(),
        ).resolves.toMatchObject({ accessToken: 'access-token' });
    });

    it('rejects endpoints that do not belong to the pinned issuer', () => {
        expect(
            () =>
                new ExtensionOAuthClient(
                    {
                        ...configuration,
                        tokenEndpoint: 'https://tokens.attacker.example/oauth/token',
                    },
                    new CallbackIdentity(),
                    new RecordingTransport(),
                ),
        ).toThrow(new ExtensionOAuthError('invalid_configuration'));
    });
});

function successfulCallback(authorizationUrl: URL): string {
    return `${configuration.redirectUri}?code=authorization-code&state=${authorizationUrl.searchParams.get('state')}`;
}

function validTokenResponse(): unknown {
    return {
        access_token: 'access-token',
        token_type: 'Bearer',
        expires_in: 600,
        scope: 'extension:connect',
    };
}
