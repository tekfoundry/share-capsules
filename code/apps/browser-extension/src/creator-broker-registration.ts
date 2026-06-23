import {
    ctxPolicySha256,
    decodeBase64Url,
    encodeBase64Url,
    parseCtxPolicyV1,
    sha256Base64Url,
    type CtxPolicyV1,
} from '@sharecapsules/capsule-core';

import { CreatorPayloadSecrets } from './creator-payload-secrets.js';
import { DpopProofFactory } from './dpop.js';
import type { OAuthTokenSet } from './oauth.js';
import type { StoredViewerDeviceKeys } from './viewer-device.js';

export interface CreatorBrokerRegistrationConfiguration {
    readonly grantEndpoint: string;
    readonly broker: string;
    readonly lifecycleBaseEndpoint: string;
}

export interface CreatorBrokerRegistrationInput {
    readonly registrationId: string;
    readonly capsuleId: string;
    readonly capsuleRevision: number;
    readonly payloadId: string;
    readonly policySha256: string;
    readonly policy: CtxPolicyV1;
    readonly title: string;
    readonly contentProfileId: string;
    readonly contentProfileVersion: string;
    readonly mediaType: string;
}

export interface CreatorBrokerRegistrationResult {
    readonly broker: string;
    readonly releaseHandle: string;
    readonly registrationId: string;
}

export interface JsonPostResponse {
    readonly status: number;
    readonly cacheControl: string | null;
    readonly body: unknown;
}

export interface JsonPostTransport {
    post(
        endpoint: string,
        body: Readonly<Record<string, unknown>>,
        headers?: Readonly<Record<string, string>>,
    ): Promise<JsonPostResponse>;
}

export interface CreatorResourceProofFactory {
    createResourceProof(
        resourceEndpoint: string,
        accessToken: string,
        privateKey: CryptoKey,
        publicKey: StoredViewerDeviceKeys['proofPublicKey'],
    ): Promise<string>;
}

export class CreatorBrokerRegistrationError extends Error {
    public constructor(
        public readonly code:
            | 'grant_failed'
            | 'finalization_failed'
            | 'cancellation_failed'
            | 'invalid_configuration'
            | 'invalid_grant_response'
            | 'invalid_input'
            | 'invalid_registration_response'
            | 'invalid_lifecycle_response'
            | 'invalid_token'
            | 'registration_failed',
    ) {
        super(code);
        this.name = 'CreatorBrokerRegistrationError';
    }
}

export class FetchJsonPostTransport implements JsonPostTransport {
    public async post(
        endpoint: string,
        body: Readonly<Record<string, unknown>>,
        headers: Readonly<Record<string, string>> = {},
    ): Promise<JsonPostResponse> {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(body),
            cache: 'no-store',
            credentials: 'omit',
        });
        let payload: unknown;
        try {
            payload = await response.json();
        } catch {
            payload = undefined;
        }

        return {
            status: response.status,
            cacheControl: response.headers.get('Cache-Control'),
            body: payload,
        };
    }
}

export class CreatorBrokerRegistrationClient {
    private readonly grantEndpoint: string;
    private readonly broker: string;
    private readonly registrationEndpoint: string;
    private readonly lifecycleBaseEndpoint: string;

    public constructor(
        configuration: CreatorBrokerRegistrationConfiguration,
        private readonly transport: JsonPostTransport = new FetchJsonPostTransport(),
        private readonly proofFactory: CreatorResourceProofFactory = new DpopProofFactory(),
    ) {
        try {
            this.grantEndpoint = exactSecureUrl(configuration.grantEndpoint, false);
            this.broker = exactSecureUrl(configuration.broker, true);
            this.registrationEndpoint = `${this.broker}/registrations`;
            this.lifecycleBaseEndpoint = exactSecureUrl(configuration.lifecycleBaseEndpoint, true);
        } catch {
            throw new CreatorBrokerRegistrationError('invalid_configuration');
        }
    }

    public async register(
        input: CreatorBrokerRegistrationInput,
        secrets: CreatorPayloadSecrets,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<CreatorBrokerRegistrationResult> {
        validateInput(input);
        validateToken(token);
        try {
            const policy = parseCtxPolicyV1(input.policy);
            if ((await ctxPolicySha256(policy)) !== input.policySha256) {
                throw new Error('policy_digest_mismatch');
            }
        } catch {
            throw new CreatorBrokerRegistrationError('invalid_input');
        }

        let contentKeySha256: string;
        try {
            contentKeySha256 = await secrets.withContentKey(sha256Base64Url);
        } catch {
            throw new CreatorBrokerRegistrationError('registration_failed');
        }
        let proof: string;
        try {
            proof = await this.proofFactory.createResourceProof(
                this.grantEndpoint,
                token.accessToken,
                device.proofPrivateKey,
                device.proofPublicKey,
            );
        } catch {
            throw new CreatorBrokerRegistrationError('grant_failed');
        }
        const grantResponse = await this.post(
            this.grantEndpoint,
            {
                registration_id: input.registrationId,
                capsule_id: input.capsuleId,
                capsule_revision: input.capsuleRevision,
                payload_id: input.payloadId,
                policy_sha256: input.policySha256,
                policy: input.policy,
                title: input.title,
                content_profile_id: input.contentProfileId,
                content_profile_version: input.contentProfileVersion,
                media_type: input.mediaType,
                content_key_sha256: contentKeySha256,
            },
            {
                Authorization: `DPoP ${token.accessToken}`,
                DPoP: proof,
            },
            'grant_failed',
        );
        const grant = parseGrantResponse(grantResponse, this.broker);

        let registrationResponse: JsonPostResponse;
        try {
            registrationResponse = await secrets.withContentKey(async (contentKey) =>
                this.post(
                    this.registrationEndpoint,
                    {
                        type: 'broker-key-registration',
                        version: 1,
                        grant: grant.grant,
                        registration_id: input.registrationId,
                        capsule_id: input.capsuleId,
                        payload_id: input.payloadId,
                        content_key: encodeBase64Url(contentKey),
                    },
                    {},
                    'registration_failed',
                ),
            );
        } catch (error) {
            if (error instanceof CreatorBrokerRegistrationError) throw error;
            throw new CreatorBrokerRegistrationError('registration_failed');
        }
        const releaseHandle = parseRegistrationResponse(registrationResponse);

        return Object.freeze({
            broker: this.broker,
            releaseHandle,
            registrationId: input.registrationId,
        });
    }

    public async finalize(
        registration: CreatorBrokerRegistrationResult,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<void> {
        await this.applyLifecycle(
            'finalize',
            registration,
            { release_handle: registration.releaseHandle },
            token,
            device,
            'finalization_failed',
        );
    }

    public async cancel(
        registration: CreatorBrokerRegistrationResult,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
    ): Promise<void> {
        await this.applyLifecycle('cancel', registration, {}, token, device, 'cancellation_failed');
    }

    private async applyLifecycle(
        operation: 'finalize' | 'cancel',
        registration: CreatorBrokerRegistrationResult,
        body: Readonly<Record<string, unknown>>,
        token: OAuthTokenSet,
        device: StoredViewerDeviceKeys,
        errorCode: 'finalization_failed' | 'cancellation_failed',
    ): Promise<void> {
        validateToken(token);
        validateRegistration(registration, this.broker);
        const endpoint = `${this.lifecycleBaseEndpoint}/${registration.registrationId}/${operation}`;
        let proof: string;
        try {
            proof = await this.proofFactory.createResourceProof(
                endpoint,
                token.accessToken,
                device.proofPrivateKey,
                device.proofPublicKey,
            );
        } catch {
            throw new CreatorBrokerRegistrationError(errorCode);
        }
        const response = await this.post(
            endpoint,
            body,
            { Authorization: `DPoP ${token.accessToken}`, DPoP: proof },
            errorCode,
        );
        const value = exactRecord(
            response.body,
            ['registration_id', 'status', 'type', 'version'],
            'invalid_lifecycle_response',
        );
        const expectedStatus = operation === 'finalize' ? 'active' : 'destroyed';
        if (
            response.status !== 200 ||
            !noStore(response.cacheControl) ||
            value.type !== 'capsule-registration' ||
            value.version !== 1 ||
            value.registration_id !== registration.registrationId ||
            value.status !== expectedStatus
        ) {
            throw new CreatorBrokerRegistrationError('invalid_lifecycle_response');
        }
    }

    private async post(
        endpoint: string,
        body: Readonly<Record<string, unknown>>,
        headers: Readonly<Record<string, string>>,
        errorCode:
            | 'grant_failed'
            | 'registration_failed'
            | 'finalization_failed'
            | 'cancellation_failed',
    ): Promise<JsonPostResponse> {
        try {
            return await this.transport.post(endpoint, body, headers);
        } catch {
            throw new CreatorBrokerRegistrationError(errorCode);
        }
    }
}

export function createBrokerRegistrationId(
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}` = () =>
        crypto.randomUUID(),
): string {
    return `registration_${randomUUID().replaceAll('-', '')}`;
}

function parseGrantResponse(
    response: JsonPostResponse,
    expectedBroker: string,
): { readonly grant: string } {
    if (response.status !== 201 || !noStore(response.cacheControl)) {
        throw new CreatorBrokerRegistrationError('invalid_grant_response');
    }
    const body = exactRecord(
        response.body,
        ['broker', 'expires_in', 'grant', 'type', 'version'],
        'invalid_grant_response',
    );
    if (
        body.type !== 'broker-registration-grant' ||
        body.version !== 1 ||
        body.expires_in !== 60 ||
        typeof body.broker !== 'string' ||
        canonicalBroker(body.broker) !== expectedBroker ||
        typeof body.grant !== 'string' ||
        !encodedLength(body.grant, 32)
    ) {
        throw new CreatorBrokerRegistrationError('invalid_grant_response');
    }

    return { grant: body.grant };
}

function parseRegistrationResponse(response: JsonPostResponse): string {
    if (![200, 201].includes(response.status) || !noStore(response.cacheControl)) {
        throw new CreatorBrokerRegistrationError('invalid_registration_response');
    }
    const body = exactRecord(
        response.body,
        ['release_handle', 'type', 'version'],
        'invalid_registration_response',
    );
    if (
        body.type !== 'broker-key-registration' ||
        body.version !== 1 ||
        typeof body.release_handle !== 'string' ||
        !encodedLength(body.release_handle, 32)
    ) {
        throw new CreatorBrokerRegistrationError('invalid_registration_response');
    }

    return body.release_handle;
}

function validateInput(input: CreatorBrokerRegistrationInput): void {
    if (
        !/^registration_[a-f0-9]{32}$/u.test(input.registrationId) ||
        !/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(
            input.capsuleId,
        ) ||
        !Number.isSafeInteger(input.capsuleRevision) ||
        input.capsuleRevision < 1 ||
        !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(input.payloadId) ||
        input.payloadId.length > 64 ||
        typeof input.title !== 'string' ||
        input.title.length < 1 ||
        input.title.length > 200 ||
        !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(input.contentProfileId) ||
        input.contentProfileId.length > 128 ||
        !/^\d+\.\d+$/u.test(input.contentProfileVersion) ||
        input.contentProfileVersion.length > 32 ||
        !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u.test(input.mediaType) ||
        input.mediaType.length > 127 ||
        !encodedLength(input.policySha256, 32) ||
        input.policy === undefined
    ) {
        throw new CreatorBrokerRegistrationError('invalid_input');
    }
}

function validateToken(token: OAuthTokenSet): void {
    if (
        token.tokenType !== 'DPoP' ||
        token.accessToken.length === 0 ||
        !token.scopes.includes('capsule:create')
    ) {
        throw new CreatorBrokerRegistrationError('invalid_token');
    }
}

function validateRegistration(
    registration: CreatorBrokerRegistrationResult,
    expectedBroker: string,
): void {
    if (
        registration.broker !== expectedBroker ||
        !/^registration_[a-f0-9]{32}$/u.test(registration.registrationId) ||
        !encodedLength(registration.releaseHandle, 32)
    ) {
        throw new CreatorBrokerRegistrationError('invalid_input');
    }
}

function exactRecord(
    value: unknown,
    expectedKeys: readonly string[],
    errorCode:
        | 'invalid_grant_response'
        | 'invalid_registration_response'
        | 'invalid_lifecycle_response',
): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new CreatorBrokerRegistrationError(errorCode);
    }
    const record = value as Record<string, unknown>;
    const actual = Object.keys(record).sort();
    const expected = [...expectedKeys].sort();
    if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
        throw new CreatorBrokerRegistrationError(errorCode);
    }

    return record;
}

function encodedLength(value: string, expectedLength: number): boolean {
    try {
        return decodeBase64Url(value).byteLength === expectedLength;
    } catch {
        return false;
    }
}

function noStore(value: string | null): boolean {
    return (
        value
            ?.toLowerCase()
            .split(',')
            .some((part) => part.trim() === 'no-store') === true
    );
}

function exactSecureUrl(value: string, normalizeTrailingSlash: boolean): string {
    const url = new URL(value);
    if (
        (url.protocol !== 'https:' &&
            !(
                url.protocol === 'http:' &&
                ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
            )) ||
        url.username !== '' ||
        url.password !== '' ||
        url.search !== '' ||
        url.hash !== ''
    ) {
        throw new Error('invalid_url');
    }
    if (normalizeTrailingSlash) {
        const path = url.pathname.replace(/\/+$/u, '');
        return `${url.origin}${path === '' ? '' : path}`;
    }

    return url.toString();
}

function canonicalBroker(value: string): string {
    try {
        return exactSecureUrl(value, true);
    } catch {
        throw new CreatorBrokerRegistrationError('invalid_grant_response');
    }
}
