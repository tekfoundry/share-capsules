import type { ContentProfileRegistration } from '@sharecapsules/capsule-core';

export interface ContentByteSource {
    readonly size: number;
    read(): Promise<Uint8Array>;
}

export interface ContentInspectionIssue {
    readonly code:
        | 'animated_content'
        | 'decode_failed'
        | 'decoded_size_exceeded'
        | 'dimension_exceeded'
        | 'empty_content'
        | 'encoded_size_exceeded'
        | 'malformed_content'
        | 'pixel_count_exceeded'
        | 'read_failed'
        | 'size_mismatch'
        | 'unsupported_content';
    readonly message: string;
}

export type ContentInspection<TMetadata> =
    | {
          readonly valid: true;
          readonly metadata: TMetadata;
      }
    | {
          readonly valid: false;
          readonly issues: readonly ContentInspectionIssue[];
      };

export interface CreatorContentProfile<TMetadata = unknown> extends ContentProfileRegistration {
    inspect(source: ContentByteSource): Promise<ContentInspection<TMetadata>>;
}
