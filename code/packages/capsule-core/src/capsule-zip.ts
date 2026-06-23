import { validatePayloadEntryCommitment } from './entry-commitment.js';
import {
    canonicalizeCapsuleManifest,
    verifyCapsuleManifestSignature,
} from './manifest-signature.js';
import {
    expectedArchiveEntries,
    parseCapsuleManifest,
    validateArchiveEntryNames,
} from './manifest.js';

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const ZIP_VERSION = 20;
const DOS_1980_01_01 = 0x0021;
const END_RECORD_BYTES = 22;
const V1_ENTRY_COUNT = 3;
const MAX_CAPSULE_BYTES = 27 * 1024 * 1024;

export interface VerifiedCapsuleArchiveV1 {
    readonly manifest: ReturnType<typeof parseCapsuleManifest>;
    readonly manifestSignature: Uint8Array;
    readonly encryptedPayload: Uint8Array;
}

export class CapsuleZipError extends Error {
    public constructor(
        public readonly code: 'invalid_entry' | 'invalid_signature' | 'size_exceeded',
    ) {
        super(code);
        this.name = 'CapsuleZipError';
    }
}

export async function verifyCapsuleZipV1(archive: Uint8Array): Promise<VerifiedCapsuleArchiveV1> {
    if (archive.byteLength > MAX_CAPSULE_BYTES) throw new CapsuleZipError('size_exceeded');
    if (archive.byteLength < END_RECORD_BYTES) throw new CapsuleZipError('invalid_entry');

    const endOffset = archive.byteLength - END_RECORD_BYTES;
    if (readU32(archive, endOffset) !== END_OF_CENTRAL_DIRECTORY) invalidEntry();
    if (
        readU16(archive, endOffset + 4) !== 0 ||
        readU16(archive, endOffset + 6) !== 0 ||
        readU16(archive, endOffset + 8) !== V1_ENTRY_COUNT ||
        readU16(archive, endOffset + 10) !== V1_ENTRY_COUNT ||
        readU16(archive, endOffset + 20) !== 0
    ) {
        invalidEntry();
    }
    const centralSize = readU32(archive, endOffset + 12);
    const centralOffset = readU32(archive, endOffset + 16);
    if (centralOffset + centralSize !== endOffset) invalidEntry();

    const entries: ParsedEntry[] = [];
    let centralCursor = centralOffset;
    for (let index = 0; index < V1_ENTRY_COUNT; index++) {
        requireRange(archive, centralCursor, 46);
        if (
            readU32(archive, centralCursor) !== CENTRAL_DIRECTORY_HEADER ||
            readU16(archive, centralCursor + 6) > ZIP_VERSION ||
            readU16(archive, centralCursor + 8) !== 0 ||
            readU16(archive, centralCursor + 10) !== 0 ||
            readU16(archive, centralCursor + 30) !== 0 ||
            readU16(archive, centralCursor + 32) !== 0 ||
            readU16(archive, centralCursor + 34) !== 0 ||
            readU16(archive, centralCursor + 36) !== 0 ||
            readU32(archive, centralCursor + 38) !== 0
        ) {
            invalidEntry();
        }
        const nameLength = readU16(archive, centralCursor + 28);
        requireRange(archive, centralCursor + 46, nameLength);
        const nameBytes = archive.subarray(centralCursor + 46, centralCursor + 46 + nameLength);
        const name = decodeEntryName(nameBytes);
        entries.push({
            name,
            crc: readU32(archive, centralCursor + 16),
            size: readU32(archive, centralCursor + 20),
            localOffset: readU32(archive, centralCursor + 42),
            bytes: new Uint8Array(),
        });
        if (readU32(archive, centralCursor + 20) !== readU32(archive, centralCursor + 24)) {
            invalidEntry();
        }
        centralCursor += 46 + nameLength;
    }
    if (centralCursor !== endOffset) invalidEntry();
    if (new Set(entries.map((entry) => entry.name)).size !== V1_ENTRY_COUNT) invalidEntry();

    const localOrder = [...entries].sort((left, right) => left.localOffset - right.localOffset);
    let expectedOffset = 0;
    for (const entry of localOrder) {
        if (entry.localOffset !== expectedOffset) invalidEntry();
        requireRange(archive, entry.localOffset, 30);
        if (
            readU32(archive, entry.localOffset) !== LOCAL_FILE_HEADER ||
            readU16(archive, entry.localOffset + 4) > ZIP_VERSION ||
            readU16(archive, entry.localOffset + 6) !== 0 ||
            readU16(archive, entry.localOffset + 8) !== 0 ||
            readU32(archive, entry.localOffset + 14) !== entry.crc ||
            readU32(archive, entry.localOffset + 18) !== entry.size ||
            readU32(archive, entry.localOffset + 22) !== entry.size ||
            readU16(archive, entry.localOffset + 28) !== 0
        ) {
            invalidEntry();
        }
        const nameLength = readU16(archive, entry.localOffset + 26);
        requireRange(archive, entry.localOffset + 30, nameLength + entry.size);
        if (
            decodeEntryName(
                archive.subarray(entry.localOffset + 30, entry.localOffset + 30 + nameLength),
            ) !== entry.name
        ) {
            invalidEntry();
        }
        const dataOffset = entry.localOffset + 30 + nameLength;
        entry.bytes = archive.slice(dataOffset, dataOffset + entry.size);
        if (crc32(entry.bytes) !== entry.crc) invalidEntry();
        expectedOffset = dataOffset + entry.size;
    }
    if (expectedOffset !== centralOffset) invalidEntry();

    const manifestEntry = entries.find((entry) => entry.name === 'manifest.json');
    const signatureEntry = entries.find((entry) => entry.name === 'manifest.sig');
    if (manifestEntry === undefined || signatureEntry === undefined) invalidEntry();
    if (signatureEntry.bytes.byteLength !== 64) {
        throw new CapsuleZipError('invalid_signature');
    }

    let manifestValue: unknown;
    try {
        manifestValue = JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(manifestEntry.bytes),
        );
    } catch {
        invalidEntry();
    }
    const manifest = parseCapsuleManifest(manifestValue);
    const canonicalManifest = canonicalizeCapsuleManifest(manifest);
    if (!equalBytes(manifestEntry.bytes, canonicalManifest)) invalidEntry();
    validateArchiveEntryNames(
        manifest,
        entries.map((entry) => entry.name),
    );
    const payloadEntry = entries.find((entry) => entry.name === manifest.payloads[0].path);
    if (payloadEntry === undefined) invalidEntry();
    await validatePayloadEntryCommitment(manifest, payloadEntry.bytes);
    if (!(await verifyCapsuleManifestSignature(manifest, signatureEntry.bytes))) {
        throw new CapsuleZipError('invalid_signature');
    }

    return Object.freeze({
        manifest,
        manifestSignature: signatureEntry.bytes,
        encryptedPayload: payloadEntry.bytes,
    });
}

export async function assembleCapsuleZipV1(
    manifestValue: unknown,
    signature: Uint8Array,
    encryptedPayload: Uint8Array,
): Promise<Uint8Array> {
    const manifest = parseCapsuleManifest(manifestValue);
    if (signature.byteLength !== 64) throw new CapsuleZipError('invalid_signature');
    await validatePayloadEntryCommitment(manifest, encryptedPayload);

    const entries = [
        { name: 'manifest.json', bytes: canonicalizeCapsuleManifest(manifest) },
        { name: 'manifest.sig', bytes: signature },
        { name: manifest.payloads[0].path, bytes: encryptedPayload },
    ];
    validateArchiveEntryNames(
        manifest,
        entries.map((entry) => entry.name),
    );
    if (
        entries
            .map((entry) => entry.name)
            .sort()
            .join('\n') !== expectedArchiveEntries(manifest).join('\n')
    ) {
        throw new CapsuleZipError('invalid_entry');
    }

    return writeStoredZip(entries);
}

function writeStoredZip(
    entries: readonly { readonly name: string; readonly bytes: Uint8Array }[],
): Uint8Array {
    const encoded = entries.map((entry) => ({
        ...entry,
        nameBytes: new TextEncoder().encode(entry.name),
        crc: crc32(entry.bytes),
    }));
    let localSize = 0;
    for (const entry of encoded) {
        if (entry.nameBytes.byteLength > 0xffff || entry.bytes.byteLength > 0xffffffff) {
            throw new CapsuleZipError('size_exceeded');
        }
        localSize += 30 + entry.nameBytes.byteLength + entry.bytes.byteLength;
    }
    const centralSize = encoded.reduce((size, entry) => size + 46 + entry.nameBytes.byteLength, 0);
    const totalSize = localSize + centralSize + 22;
    if (totalSize > 0xffffffff) throw new CapsuleZipError('size_exceeded');

    const output = new Uint8Array(totalSize);
    let cursor = 0;
    const offsets: number[] = [];
    for (const entry of encoded) {
        offsets.push(cursor);
        writeU32(output, cursor, LOCAL_FILE_HEADER);
        writeU16(output, cursor + 4, ZIP_VERSION);
        writeU16(output, cursor + 6, 0);
        writeU16(output, cursor + 8, 0);
        writeU16(output, cursor + 10, 0);
        writeU16(output, cursor + 12, DOS_1980_01_01);
        writeU32(output, cursor + 14, entry.crc);
        writeU32(output, cursor + 18, entry.bytes.byteLength);
        writeU32(output, cursor + 22, entry.bytes.byteLength);
        writeU16(output, cursor + 26, entry.nameBytes.byteLength);
        writeU16(output, cursor + 28, 0);
        output.set(entry.nameBytes, cursor + 30);
        output.set(entry.bytes, cursor + 30 + entry.nameBytes.byteLength);
        cursor += 30 + entry.nameBytes.byteLength + entry.bytes.byteLength;
    }

    const centralOffset = cursor;
    for (const [index, entry] of encoded.entries()) {
        writeU32(output, cursor, CENTRAL_DIRECTORY_HEADER);
        writeU16(output, cursor + 4, ZIP_VERSION);
        writeU16(output, cursor + 6, ZIP_VERSION);
        writeU16(output, cursor + 8, 0);
        writeU16(output, cursor + 10, 0);
        writeU16(output, cursor + 12, 0);
        writeU16(output, cursor + 14, DOS_1980_01_01);
        writeU32(output, cursor + 16, entry.crc);
        writeU32(output, cursor + 20, entry.bytes.byteLength);
        writeU32(output, cursor + 24, entry.bytes.byteLength);
        writeU16(output, cursor + 28, entry.nameBytes.byteLength);
        writeU16(output, cursor + 30, 0);
        writeU16(output, cursor + 32, 0);
        writeU16(output, cursor + 34, 0);
        writeU16(output, cursor + 36, 0);
        writeU32(output, cursor + 38, 0);
        writeU32(output, cursor + 42, offsets[index] ?? 0);
        output.set(entry.nameBytes, cursor + 46);
        cursor += 46 + entry.nameBytes.byteLength;
    }

    writeU32(output, cursor, END_OF_CENTRAL_DIRECTORY);
    writeU16(output, cursor + 4, 0);
    writeU16(output, cursor + 6, 0);
    writeU16(output, cursor + 8, encoded.length);
    writeU16(output, cursor + 10, encoded.length);
    writeU32(output, cursor + 12, centralSize);
    writeU32(output, cursor + 16, centralOffset);
    writeU16(output, cursor + 20, 0);

    return output;
}

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function writeU16(target: Uint8Array, offset: number, value: number): void {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
}

function writeU32(target: Uint8Array, offset: number, value: number): void {
    writeU16(target, offset, value & 0xffff);
    writeU16(target, offset + 2, value >>> 16);
}

interface ParsedEntry {
    readonly name: string;
    readonly crc: number;
    readonly size: number;
    readonly localOffset: number;
    bytes: Uint8Array;
}

function readU16(source: Uint8Array, offset: number): number {
    requireRange(source, offset, 2);
    return source[offset]! | (source[offset + 1]! << 8);
}

function readU32(source: Uint8Array, offset: number): number {
    requireRange(source, offset, 4);
    return (readU16(source, offset) | (readU16(source, offset + 2) << 16)) >>> 0;
}

function requireRange(source: Uint8Array, offset: number, length: number): void {
    if (
        !Number.isSafeInteger(offset) ||
        !Number.isSafeInteger(length) ||
        offset < 0 ||
        length < 0 ||
        offset + length > source.byteLength
    ) {
        invalidEntry();
    }
}

function decodeEntryName(bytes: Uint8Array): string {
    let value: string;
    try {
        value = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        invalidEntry();
    }
    if (value.length === 0 || !/^[a-z0-9./-]+$/.test(value)) invalidEntry();
    return value;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
    if (left.byteLength !== right.byteLength) return false;
    let difference = 0;
    for (let index = 0; index < left.byteLength; index++) {
        difference |= left[index]! ^ right[index]!;
    }
    return difference === 0;
}

function invalidEntry(): never {
    throw new CapsuleZipError('invalid_entry');
}
