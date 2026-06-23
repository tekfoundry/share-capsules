import type { ValidateFunction } from 'ajv';
import type { CapsuleManifestV1 } from '../manifest.js';
import type { CtxPolicyV1 } from '../policy.js';

export const validatePolicySchema: ValidateFunction<CtxPolicyV1>;
export const validateManifestSchema: ValidateFunction<CapsuleManifestV1>;
