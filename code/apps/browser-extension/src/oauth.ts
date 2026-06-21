export interface ExtensionOAuthConfiguration {
    readonly issuer: string;
    readonly authorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly clientId: string;
    readonly redirectUri: string;
    readonly scopes: readonly string[];
}

export interface ExtensionIdentityFlow {
    launchWebAuthFlow(authorizationUrl: string): Promise<string>;
}

export interface OAuthTokenTransport {
    exchange(tokenEndpoint: string, parameters: URLSearchParams): Promise<unknown>;
}

export interface OAuthTokenSet {
    readonly accessToken: string;
    readonly tokenType: 'Bearer';
    readonly expiresIn: number;
    readonly scopes: readonly string[];
}

export class ExtensionOAuthError extends Error {
    public constructor(
        public readonly code:
            | 'authorization_denied'
            | 'callback_mismatch'
            | 'invalid_callback'
            | 'invalid_configuration'
            | 'invalid_token_response'
            | 'session_already_used'
            | 'state_mismatch',
    ) {
        super(code);
        this.name = 'ExtensionOAuthError';
    }
}

export class FetchOAuthTokenTransport implements OAuthTokenTransport {
    public async exchange(tokenEndpoint: string, parameters: URLSearchParams): Promise<unknown> {
        try {
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: parameters,
            });
            const payload: unknown = await response.json();

            if (!response.ok) throw new ExtensionOAuthError('invalid_token_response');

            return payload;
        } catch (error) {
            if (error instanceof ExtensionOAuthError) throw error;
            throw new ExtensionOAuthError('invalid_token_response');
        }
    }
}

export class ExtensionOAuthClient {
    public constructor(
        private readonly configuration: ExtensionOAuthConfiguration,
        private readonly identity: ExtensionIdentityFlow,
        private readonly transport: OAuthTokenTransport,
        private readonly cryptography: Pick<Crypto, 'getRandomValues' | 'subtle'> = crypto,
    ) {
        validateConfiguration(configuration);
    }

    public async connect(): Promise<OAuthTokenSet> {
        const session = await AuthorizationSession.create(this.configuration, this.cryptography);
        const callback = await this.identity.launchWebAuthFlow(session.authorizationUrl);

        return session.exchange(callback, this.transport);
    }
}

class AuthorizationSession {
    private used = false;

    private constructor(
        private readonly configuration: ExtensionOAuthConfiguration,
        private readonly state: string,
        private readonly verifier: string,
        public readonly authorizationUrl: string,
    ) {}

    public static async create(
        configuration: ExtensionOAuthConfiguration,
        cryptography: Pick<Crypto, 'getRandomValues' | 'subtle'>,
    ): Promise<AuthorizationSession> {
        const state = randomBase64Url(32, cryptography);
        const verifier = randomBase64Url(64, cryptography);
        const challenge = encodeBase64Url(
            new Uint8Array(
                await cryptography.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
            ),
        );
        const url = new URL(configuration.authorizationEndpoint);
        url.search = new URLSearchParams({
            client_id: configuration.clientId,
            redirect_uri: configuration.redirectUri,
            response_type: 'code',
            scope: configuration.scopes.join(' '),
            state,
            code_challenge: challenge,
            code_challenge_method: 'S256',
            prompt: 'consent',
        }).toString();

        return new AuthorizationSession(configuration, state, verifier, url.toString());
    }

    public async exchange(
        callbackValue: string,
        transport: OAuthTokenTransport,
    ): Promise<OAuthTokenSet> {
        if (this.used) throw new ExtensionOAuthError('session_already_used');
        this.used = true;

        const callback = parseCallback(callbackValue);
        const expected = new URL(this.configuration.redirectUri);

        if (
            callback.origin !== expected.origin ||
            callback.pathname !== expected.pathname ||
            callback.username !== '' ||
            callback.password !== '' ||
            callback.hash !== ''
        ) {
            throw new ExtensionOAuthError('callback_mismatch');
        }

        if (callback.searchParams.get('state') !== this.state) {
            throw new ExtensionOAuthError('state_mismatch');
        }

        if (callback.searchParams.has('error')) {
            throw new ExtensionOAuthError('authorization_denied');
        }

        const code = callback.searchParams.get('code');
        if (!code) throw new ExtensionOAuthError('invalid_callback');

        const payload = await transport.exchange(
            this.configuration.tokenEndpoint,
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: this.configuration.clientId,
                redirect_uri: this.configuration.redirectUri,
                code,
                code_verifier: this.verifier,
            }),
        );

        return parseTokenSet(payload);
    }
}

function validateConfiguration(configuration: ExtensionOAuthConfiguration): void {
    try {
        const authorizationEndpoint = new URL(configuration.authorizationEndpoint);
        const tokenEndpoint = new URL(configuration.tokenEndpoint);
        const redirectUri = new URL(configuration.redirectUri);
        const issuer = new URL(configuration.issuer);

        if (
            !isSecureServiceEndpoint(issuer) ||
            !isSecureServiceEndpoint(authorizationEndpoint) ||
            !isSecureServiceEndpoint(tokenEndpoint) ||
            authorizationEndpoint.origin !== issuer.origin ||
            tokenEndpoint.origin !== issuer.origin ||
            issuer.search !== '' ||
            issuer.hash !== '' ||
            redirectUri.protocol !== 'https:' ||
            redirectUri.search !== '' ||
            redirectUri.hash !== '' ||
            configuration.clientId.length === 0 ||
            configuration.scopes.length === 0
        ) {
            throw new ExtensionOAuthError('invalid_configuration');
        }
    } catch (error) {
        if (error instanceof ExtensionOAuthError) throw error;
        throw new ExtensionOAuthError('invalid_configuration');
    }
}

function isSecureServiceEndpoint(url: URL): boolean {
    return (
        url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    );
}

function parseCallback(value: string): URL {
    try {
        return new URL(value);
    } catch {
        throw new ExtensionOAuthError('invalid_callback');
    }
}

function parseTokenSet(value: unknown): OAuthTokenSet {
    if (!isRecord(value)) throw new ExtensionOAuthError('invalid_token_response');

    const accessToken = value.access_token;
    const tokenType = value.token_type;
    const expiresIn = value.expires_in;
    const scope = value.scope;

    if (
        typeof accessToken !== 'string' ||
        accessToken.length === 0 ||
        tokenType !== 'Bearer' ||
        typeof expiresIn !== 'number' ||
        !Number.isFinite(expiresIn) ||
        expiresIn <= 0 ||
        (scope !== undefined && typeof scope !== 'string')
    ) {
        throw new ExtensionOAuthError('invalid_token_response');
    }

    return {
        accessToken,
        tokenType,
        expiresIn,
        scopes: typeof scope === 'string' && scope !== '' ? scope.split(' ') : [],
    };
}

function randomBase64Url(length: number, cryptography: Pick<Crypto, 'getRandomValues'>): string {
    const bytes = new Uint8Array(length);
    cryptography.getRandomValues(bytes);

    return encodeBase64Url(bytes);
}

function encodeBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
