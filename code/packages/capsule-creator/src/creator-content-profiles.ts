import { ContentProfileRegistry } from '@sharecapsules/capsule-core';

import { StaticImageCreatorProfileV1 } from './static-image-creator-profile.js';

export const STATIC_IMAGE_CREATOR_PROFILE_V1 = Object.freeze(new StaticImageCreatorProfileV1());
export const TRUSTED_CREATOR_CONTENT_PROFILES = Object.freeze([
    STATIC_IMAGE_CREATOR_PROFILE_V1,
] as const);
export const CREATOR_CONTENT_PROFILE_REGISTRY = Object.freeze(
    new ContentProfileRegistry(TRUSTED_CREATOR_CONTENT_PROFILES),
);
