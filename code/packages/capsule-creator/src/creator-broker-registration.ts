import type { CtxPolicyV1 } from '@sharecapsules/capsule-core';

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

export function createBrokerRegistrationId(
    randomUUID: () => `${string}-${string}-${string}-${string}-${string}` = () =>
        crypto.randomUUID(),
): string {
    return `registration_${randomUUID().replaceAll('-', '')}`;
}
