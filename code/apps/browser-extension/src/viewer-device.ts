import { decodeBase64Url, encodeBase64Url, sha256Base64Url } from '@sharecapsules/capsule-core';

export interface OkpPublicJwk {
    readonly kty: 'OKP';
    readonly crv: 'Ed25519' | 'X25519';
    readonly x: string;
}

export interface ViewerDeviceChallenge {
    readonly type: 'ctx-viewer-device-registration';
    readonly version: '1.0';
    readonly challengeId: string;
    readonly deviceId: string;
    readonly nonce: string;
    readonly proofJkt: string;
    readonly agreementJkt: string;
    readonly serverAgreementPublicKey: string;
    readonly expiresAt: string;
}

export interface ViewerDeviceRegistrationResult {
    readonly id: string;
    readonly name: string;
    readonly status: 'active';
    readonly proofJkt: string;
    readonly agreementJkt: string;
    readonly createdAt: string;
}

export interface StoredViewerDeviceKeys {
    readonly deviceId: string;
    readonly proofPrivateKey: CryptoKey;
    readonly proofPublicKey: OkpPublicJwk;
    readonly agreementPrivateKey: CryptoKey;
    readonly agreementPublicKey: OkpPublicJwk;
}

export interface ViewerDeviceKeyStore {
    save(keys: StoredViewerDeviceKeys): Promise<void>;
    load(deviceId: string): Promise<StoredViewerDeviceKeys | undefined>;
    remove(deviceId: string): Promise<void>;
}

export interface ViewerDeviceRegistrationTransport {
    createChallenge(
        accessToken: string,
        deviceId: string,
        proofKey: OkpPublicJwk,
        agreementKey: OkpPublicJwk,
    ): Promise<ViewerDeviceChallenge>;
    register(
        accessToken: string,
        input: {
            readonly challengeId: string;
            readonly name: string;
            readonly proofSignature: string;
            readonly agreementConfirmation: string;
        },
    ): Promise<ViewerDeviceRegistrationResult>;
}

export class ViewerDeviceRegistrationError extends Error {
    public constructor(
        public readonly code:
            | 'challenge_mismatch'
            | 'invalid_response'
            | 'key_generation_failed'
            | 'registration_failed',
    ) {
        super(code);
        this.name = 'ViewerDeviceRegistrationError';
    }
}

export class ViewerDeviceRegistrar {
    public constructor(
        private readonly transport: ViewerDeviceRegistrationTransport,
        private readonly keyStore: ViewerDeviceKeyStore,
        private readonly cryptography: Pick<Crypto, 'randomUUID' | 'subtle'> = crypto,
    ) {}

    public async register(
        name: string,
        accessToken: string,
    ): Promise<ViewerDeviceRegistrationResult> {
        const keys = await ViewerDeviceKeySet.generate(this.cryptography);
        await this.keyStore.save(keys.forStorage());
        const challenge = await this.transport.createChallenge(
            accessToken,
            keys.deviceId,
            keys.proofPublicKey,
            keys.agreementPublicKey,
        );
        const answer = await keys.answer(challenge);
        const device = await this.transport.register(accessToken, {
            challengeId: challenge.challengeId,
            name,
            ...answer,
        });

        if (
            device.proofJkt !== challenge.proofJkt ||
            device.agreementJkt !== challenge.agreementJkt ||
            device.id !== challenge.deviceId
        ) {
            throw new ViewerDeviceRegistrationError('registration_failed');
        }

        return device;
    }
}

export class FetchViewerDeviceRegistrationTransport implements ViewerDeviceRegistrationTransport {
    public constructor(private readonly apiBaseUrl: string) {}

    public async createChallenge(
        accessToken: string,
        deviceId: string,
        proofKey: OkpPublicJwk,
        agreementKey: OkpPublicJwk,
    ): Promise<ViewerDeviceChallenge> {
        const response = await this.post('/api/viewer-devices/challenges', accessToken, {
            device_id: deviceId,
            proof_key: proofKey,
            agreement_key: agreementKey,
        });

        return parseChallenge(response);
    }

    public async register(
        accessToken: string,
        input: {
            readonly challengeId: string;
            readonly name: string;
            readonly proofSignature: string;
            readonly agreementConfirmation: string;
        },
    ): Promise<ViewerDeviceRegistrationResult> {
        const response = await this.post('/api/viewer-devices', accessToken, {
            challenge_id: input.challengeId,
            name: input.name,
            proof_signature: input.proofSignature,
            agreement_confirmation: input.agreementConfirmation,
        });

        return parseRegistration(response);
    }

    private async post(path: string, accessToken: string, body: unknown): Promise<unknown> {
        try {
            const response = await fetch(new URL(path, this.apiBaseUrl), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const payload: unknown = await response.json();
            if (!response.ok) throw new ViewerDeviceRegistrationError('registration_failed');

            return payload;
        } catch (error) {
            if (error instanceof ViewerDeviceRegistrationError) throw error;
            throw new ViewerDeviceRegistrationError('registration_failed');
        }
    }
}

export class IndexedDbViewerDeviceKeyStore implements ViewerDeviceKeyStore {
    public constructor(
        private readonly databaseName = 'share-capsules-viewer',
        private readonly storeName = 'viewer-device-keys',
    ) {}

    public async save(keys: StoredViewerDeviceKeys): Promise<void> {
        const database = await this.open();

        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(this.storeName, 'readwrite');
            transaction.objectStore(this.storeName).put(keys);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        database.close();
    }

    public async load(deviceId: string): Promise<StoredViewerDeviceKeys | undefined> {
        const database = await this.open();
        const result = await new Promise<StoredViewerDeviceKeys | undefined>((resolve, reject) => {
            const request = database
                .transaction(this.storeName, 'readonly')
                .objectStore(this.storeName)
                .get(deviceId);
            request.onsuccess = () =>
                resolve(isStoredViewerDeviceKeys(request.result) ? request.result : undefined);
            request.onerror = () => reject(request.error);
        });
        database.close();

        return result;
    }

    public async remove(deviceId: string): Promise<void> {
        const database = await this.open();
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(this.storeName, 'readwrite');
            transaction.objectStore(this.storeName).delete(deviceId);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });
        database.close();
    }

    private async open(): Promise<IDBDatabase> {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, 1);
            request.onupgradeneeded = () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(this.storeName)) {
                    database.createObjectStore(this.storeName, { keyPath: 'deviceId' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

class ViewerDeviceKeySet {
    private constructor(
        public readonly deviceId: string,
        private readonly proofPrivateKey: CryptoKey,
        public readonly proofPublicKey: OkpPublicJwk,
        private readonly agreementPrivateKey: CryptoKey,
        public readonly agreementPublicKey: OkpPublicJwk,
        private readonly cryptography: Pick<Crypto, 'subtle'>,
    ) {}

    public static async generate(
        cryptography: Pick<Crypto, 'randomUUID' | 'subtle'>,
    ): Promise<ViewerDeviceKeySet> {
        try {
            const proof = await cryptography.subtle.generateKey({ name: 'Ed25519' }, false, [
                'sign',
                'verify',
            ]);
            const agreement = await cryptography.subtle.generateKey({ name: 'X25519' }, false, [
                'deriveBits',
            ]);
            if (!isKeyPair(proof) || !isKeyPair(agreement)) {
                throw new ViewerDeviceRegistrationError('key_generation_failed');
            }
            const proofPublicKey = await exportPublicJwk(proof.publicKey, 'Ed25519', cryptography);
            const agreementPublicKey = await exportPublicJwk(
                agreement.publicKey,
                'X25519',
                cryptography,
            );

            if (proofPublicKey.x === agreementPublicKey.x) {
                throw new ViewerDeviceRegistrationError('key_generation_failed');
            }

            return new ViewerDeviceKeySet(
                cryptography.randomUUID(),
                proof.privateKey,
                proofPublicKey,
                agreement.privateKey,
                agreementPublicKey,
                cryptography,
            );
        } catch (error) {
            if (error instanceof ViewerDeviceRegistrationError) throw error;
            throw new ViewerDeviceRegistrationError('key_generation_failed');
        }
    }

    public async answer(challenge: ViewerDeviceChallenge): Promise<{
        proofSignature: string;
        agreementConfirmation: string;
    }> {
        const proofJkt = await okpJwkThumbprint(this.proofPublicKey);
        const agreementJkt = await okpJwkThumbprint(this.agreementPublicKey);

        if (
            challenge.deviceId !== this.deviceId ||
            challenge.proofJkt !== proofJkt ||
            challenge.agreementJkt !== agreementJkt
        ) {
            throw new ViewerDeviceRegistrationError('challenge_mismatch');
        }

        const message = viewerDeviceRegistrationMessage(challenge);
        const messageBytes = new TextEncoder().encode(message);
        const proofSignature = new Uint8Array(
            await this.cryptography.subtle.sign('Ed25519', this.proofPrivateKey, messageBytes),
        );
        const serverPublicKey = await this.cryptography.subtle.importKey(
            'jwk',
            {
                kty: 'OKP',
                crv: 'X25519',
                x: challenge.serverAgreementPublicKey,
            },
            { name: 'X25519' },
            false,
            [],
        );
        const sharedSecret = await this.cryptography.subtle.deriveBits(
            { name: 'X25519', public: serverPublicKey },
            this.agreementPrivateKey,
            256,
        );
        const hkdfKey = await this.cryptography.subtle.importKey(
            'raw',
            sharedSecret,
            'HKDF',
            false,
            ['deriveKey'],
        );
        const confirmationKey = await this.cryptography.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: toArrayBuffer(decodeBase64Url(challenge.nonce)),
                info: new TextEncoder().encode('ctx-viewer-device-registration-agreement-v1'),
            },
            hkdfKey,
            { name: 'HMAC', hash: 'SHA-256', length: 256 },
            false,
            ['sign'],
        );
        const agreementConfirmation = new Uint8Array(
            await this.cryptography.subtle.sign('HMAC', confirmationKey, messageBytes),
        );

        return {
            proofSignature: encodeBase64Url(proofSignature),
            agreementConfirmation: encodeBase64Url(agreementConfirmation),
        };
    }

    public forStorage(): StoredViewerDeviceKeys {
        return {
            deviceId: this.deviceId,
            proofPrivateKey: this.proofPrivateKey,
            proofPublicKey: this.proofPublicKey,
            agreementPrivateKey: this.agreementPrivateKey,
            agreementPublicKey: this.agreementPublicKey,
        };
    }
}

export async function okpJwkThumbprint(jwk: OkpPublicJwk): Promise<string> {
    return sha256Base64Url(
        new TextEncoder().encode(`{"crv":"${jwk.crv}","kty":"OKP","x":"${jwk.x}"}`),
    );
}

export function viewerDeviceRegistrationMessage(challenge: ViewerDeviceChallenge): string {
    return [
        challenge.type,
        challenge.version,
        `challenge_id:${challenge.challengeId}`,
        `device_id:${challenge.deviceId}`,
        `nonce:${challenge.nonce}`,
        `proof_jkt:${challenge.proofJkt}`,
        `agreement_jkt:${challenge.agreementJkt}`,
        '',
    ].join('\n');
}

async function exportPublicJwk(
    key: CryptoKey,
    curve: OkpPublicJwk['crv'],
    cryptography: Pick<Crypto, 'subtle'>,
): Promise<OkpPublicJwk> {
    const exported = await cryptography.subtle.exportKey('jwk', key);
    if (exported.kty !== 'OKP' || exported.crv !== curve || typeof exported.x !== 'string') {
        throw new ViewerDeviceRegistrationError('key_generation_failed');
    }
    const decoded = decodeBase64Url(exported.x);
    if (decoded.byteLength !== 32) {
        throw new ViewerDeviceRegistrationError('key_generation_failed');
    }

    return Object.freeze({ kty: 'OKP', crv: curve, x: exported.x });
}

function parseChallenge(value: unknown): ViewerDeviceChallenge {
    if (!isRecord(value)) throw new ViewerDeviceRegistrationError('invalid_response');

    const challenge: ViewerDeviceChallenge = {
        type: requireLiteral(value.type, 'ctx-viewer-device-registration'),
        version: requireLiteral(value.version, '1.0'),
        challengeId: requireString(value.challenge_id),
        deviceId: requireString(value.device_id),
        nonce: requireEncodedKey(value.nonce),
        proofJkt: requireEncodedKey(value.proof_jkt),
        agreementJkt: requireEncodedKey(value.agreement_jkt),
        serverAgreementPublicKey: requireEncodedKey(value.server_agreement_public_key),
        expiresAt: requireString(value.expires_at),
    };
    if (Number.isNaN(Date.parse(challenge.expiresAt))) {
        throw new ViewerDeviceRegistrationError('invalid_response');
    }

    return challenge;
}

function parseRegistration(value: unknown): ViewerDeviceRegistrationResult {
    if (!isRecord(value) || !isRecord(value.device)) {
        throw new ViewerDeviceRegistrationError('invalid_response');
    }
    const device = value.device;

    return {
        id: requireString(device.id),
        name: requireString(device.name),
        status: requireLiteral(device.status, 'active'),
        proofJkt: requireEncodedKey(device.proof_jkt),
        agreementJkt: requireEncodedKey(device.agreement_jkt),
        createdAt: requireString(device.created_at),
    };
}

function requireString(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
        throw new ViewerDeviceRegistrationError('invalid_response');
    }
    return value;
}

function requireEncodedKey(value: unknown): string {
    const encoded = requireString(value);
    if (decodeBase64Url(encoded).byteLength !== 32) {
        throw new ViewerDeviceRegistrationError('invalid_response');
    }
    return encoded;
}

function requireLiteral<const T extends string>(value: unknown, expected: T): T {
    if (value !== expected) throw new ViewerDeviceRegistrationError('invalid_response');
    return expected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStoredViewerDeviceKeys(value: unknown): value is StoredViewerDeviceKeys {
    if (!isRecord(value)) return false;

    return (
        typeof value.deviceId === 'string' &&
        value.proofPrivateKey instanceof CryptoKey &&
        value.agreementPrivateKey instanceof CryptoKey &&
        isRecord(value.proofPublicKey) &&
        isRecord(value.agreementPublicKey)
    );
}

function isKeyPair(value: CryptoKey | CryptoKeyPair): value is CryptoKeyPair {
    return 'privateKey' in value && 'publicKey' in value;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return copy.buffer;
}
