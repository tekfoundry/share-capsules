//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region apps/browser-extension/src/viewer-capsule-discovery.ts
var VIEWER_STATE_MESSAGE = "share-capsules-viewer-state";
function isSupportedCapsuleUrl(url) {
	if (url.username !== "" || url.password !== "") return false;
	if (url.protocol === "https:") return true;
	return url.protocol === "http:" && isLocalDevelopmentHost$1(url.hostname);
}
function viewerStateMessage(capsuleUrl, state = "opened", metadata = {}) {
	return {
		type: VIEWER_STATE_MESSAGE,
		state,
		capsuleUrl,
		...metadata
	};
}
function isLocalDevelopmentHost$1(hostname) {
	return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
async function fetchViewerCapsule(capsuleUrl, options = {}) {
	const maxBytes = options.maxBytes ?? 67108864;
	const maxRedirects = options.maxRedirects ?? 3;
	const timeoutMs = options.timeoutMs ?? 15e3;
	const fetchImplementation = options.fetch ?? fetch;
	const hostPermissions = options.hostPermissions;
	let currentUrl = normalizedFetchUrl(capsuleUrl);
	if (currentUrl === void 0) return {
		ok: false,
		code: "unsupported_url"
	};
	for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
		const permission = viewerHostPermissionPattern(currentUrl);
		if (hostPermissions !== void 0 && !await hostPermissions.contains(permission)) return {
			ok: false,
			code: "missing_host_permission",
			origin: new URL(currentUrl).origin,
			permission
		};
		const attempt = await fetchAttempt(fetchImplementation, currentUrl, timeoutMs);
		if (attempt.response === void 0) return {
			ok: false,
			code: attempt.timedOut ? "network_error" : "network_error"
		};
		if (isRedirectStatus(attempt.response.status)) {
			if (redirectCount === maxRedirects) return {
				ok: false,
				code: "too_many_redirects"
			};
			const location = attempt.response.headers.get("location");
			if (location === null || location.trim() === "") return {
				ok: false,
				code: "redirect_without_location"
			};
			const redirectedUrl = normalizedFetchUrl(location, currentUrl);
			if (redirectedUrl === void 0) return {
				ok: false,
				code: "unsupported_url"
			};
			currentUrl = redirectedUrl;
			continue;
		}
		if (attempt.response.status !== 200) return {
			ok: false,
			code: "unexpected_status"
		};
		if (contentLengthExceeds(attempt.response.headers.get("content-length"), maxBytes)) return {
			ok: false,
			code: "too_large"
		};
		const bytes = await readBoundedBytes(attempt.response, maxBytes);
		if (bytes === void 0) return {
			ok: false,
			code: "too_large"
		};
		if (bytes.byteLength === 0) return {
			ok: false,
			code: "empty_body"
		};
		return {
			ok: true,
			url: currentUrl,
			bytes
		};
	}
	return {
		ok: false,
		code: "too_many_redirects"
	};
}
function viewerHostPermissionPattern(url) {
	return `${new URL(url).origin}/*`;
}
function normalizedFetchUrl(rawUrl, baseUrl) {
	let url;
	try {
		url = new URL(rawUrl, baseUrl);
	} catch {
		return;
	}
	if (!isSupportedCapsuleUrl(url)) return void 0;
	if (url.protocol === "https:" && isForbiddenNetworkHostname(url.hostname)) return void 0;
	url.hash = "";
	return url.href;
}
async function fetchAttempt(fetchImplementation, url, timeoutMs) {
	const controller = new AbortController();
	let timedOut = false;
	const timeout = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);
	try {
		return {
			response: await fetchImplementation(url, {
				cache: "no-store",
				credentials: "omit",
				redirect: "manual",
				referrerPolicy: "no-referrer",
				signal: controller.signal
			}),
			timedOut
		};
	} catch {
		return { timedOut };
	} finally {
		clearTimeout(timeout);
	}
}
function isRedirectStatus(status) {
	return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}
function contentLengthExceeds(value, maxBytes) {
	if (value === null) return false;
	if (!/^[0-9]+$/u.test(value)) return true;
	return Number(value) > maxBytes;
}
async function readBoundedBytes(response, maxBytes) {
	if (response.body === null) {
		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > maxBytes) return void 0;
		return new Uint8Array(buffer);
	}
	const reader = response.body.getReader();
	const chunks = [];
	let totalBytes = 0;
	try {
		while (true) {
			const read = await reader.read();
			if (read.done) break;
			totalBytes += read.value.byteLength;
			if (totalBytes > maxBytes) return void 0;
			chunks.push(read.value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
function isForbiddenNetworkHostname(hostname) {
	const normalized = hostname.toLowerCase();
	if (normalized === "localhost" || normalized === "[::1]" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) return true;
	const ipv4 = parseDottedIpv4(normalized);
	if (ipv4 !== void 0) return isForbiddenIpv4(ipv4);
	if (normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
	return false;
}
function parseDottedIpv4(hostname) {
	const parts = hostname.split(".");
	if (parts.length !== 4) return void 0;
	const first = parseIpv4Part(parts[0]);
	const second = parseIpv4Part(parts[1]);
	const third = parseIpv4Part(parts[2]);
	const fourth = parseIpv4Part(parts[3]);
	if (first === void 0 || second === void 0 || third === void 0 || fourth === void 0) return;
	return [
		first,
		second,
		third,
		fourth
	];
}
function parseIpv4Part(part) {
	if (part === void 0 || !/^[0-9]{1,3}$/u.test(part)) return void 0;
	const value = Number(part);
	return value <= 255 ? value : void 0;
}
function isForbiddenIpv4([first, second]) {
	if (first === 0 || first === 10 || first === 127) return true;
	if (first === 169 && second === 254) return true;
	if (first === 172 && second >= 16 && second <= 31) return true;
	if (first === 192 && second === 168) return true;
	if (first === 100 && second >= 64 && second <= 127) return true;
	return false;
}
//#endregion
//#region packages/capsule-core/dist/cryptographic-suite.js
var CAPSULE_SUITE_ID = "ctx-capsule-v1";
var MANIFEST_SIGNATURE_ALGORITHM_ID = "Ed25519";
var DIGEST_ALGORITHM_ID = "SHA-256";
var PAYLOAD_ENCRYPTION_ALGORITHM_ID = "AES-256-GCM";
var CAPSULE_CRYPTOGRAPHIC_SUITE_V1 = Object.freeze({
	id: CAPSULE_SUITE_ID,
	manifestSignature: Object.freeze({
		algorithm: MANIFEST_SIGNATURE_ALGORITHM_ID,
		publicKeyBytes: 32,
		signatureBytes: 64
	}),
	digest: Object.freeze({
		algorithm: DIGEST_ALGORITHM_ID,
		outputBytes: 32
	}),
	payloadEncryption: Object.freeze({
		algorithm: PAYLOAD_ENCRYPTION_ALGORITHM_ID,
		keyBytes: 32,
		nonceBytes: 12,
		tagBytes: 16
	}),
	contentKeyDelivery: Object.freeze({
		protocol: "HPKE",
		mode: "base",
		modeCode: 0,
		kem: "DHKEM(X25519, HKDF-SHA256)",
		kemCode: 32,
		kdf: "HKDF-SHA256",
		kdfCode: 1,
		aead: "AES-256-GCM",
		aeadCode: 2
	})
});
Object.freeze([CAPSULE_SUITE_ID]);
//#endregion
//#region packages/capsule-core/dist/base64url.js
var BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;
var Base64UrlError = class extends Error {
	code = "invalid_base64url";
	constructor(message) {
		super(message);
		this.name = "Base64UrlError";
	}
};
function encodeBase64Url$1(value) {
	let binary = "";
	for (const byte of value) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function decodeBase64Url(value) {
	if (!BASE64URL_PATTERN.test(value) || value.length % 4 === 1) throw new Base64UrlError("Value must be unpadded base64url.");
	const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
	const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
	let binary;
	try {
		binary = atob(padded);
	} catch {
		throw new Base64UrlError("Value must be valid unpadded base64url.");
	}
	const decoded = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	if (encodeBase64Url$1(decoded) !== value) throw new Base64UrlError("Value must use the canonical unpadded base64url encoding.");
	return decoded;
}
//#endregion
//#region node_modules/canonicalize/lib/canonicalize.js
function canonicalize(object, seen = /* @__PURE__ */ new Set()) {
	if (typeof object === "number" && isNaN(object)) throw new Error("NaN is not allowed");
	if (typeof object === "number" && !isFinite(object)) throw new Error("Infinity is not allowed");
	if (object === null || typeof object !== "object") return JSON.stringify(object);
	if (typeof object.toJSON === "function") {
		if (seen.has(object)) throw new Error("Circular reference detected");
		seen.add(object);
		const result = canonicalize(object.toJSON(), seen);
		seen.delete(object);
		return result;
	}
	if (seen.has(object)) throw new Error("Circular reference detected");
	seen.add(object);
	let result;
	if (Array.isArray(object)) result = `[${object.map((cv) => {
		return canonicalize(cv === void 0 || typeof cv === "symbol" ? null : cv, seen);
	}).join(",")}]`;
	else {
		const parts = [];
		for (const key of Object.keys(object).sort()) {
			if (object[key] === void 0 || typeof object[key] === "symbol") continue;
			parts.push(`${canonicalize(key)}:${canonicalize(object[key], seen)}`);
		}
		result = `{${parts.join(",")}}`;
	}
	seen.delete(object);
	return result;
}
var JsonCanonicalizationError = class extends Error {
	path;
	code = "invalid_canonical_json_input";
	constructor(path, message) {
		super(message);
		this.path = path;
		this.name = "JsonCanonicalizationError";
	}
};
function canonicalizeJson(value) {
	assertIJsonValue(value, "$", 0, /* @__PURE__ */ new Set());
	const result = canonicalize(value);
	if (typeof result !== "string") throw new JsonCanonicalizationError("$", "Input must produce a JSON value.");
	return result;
}
function canonicalizeJsonBytes(value) {
	return new TextEncoder().encode(canonicalizeJson(value));
}
function assertIJsonValue(value, path, depth, ancestors) {
	if (depth > 64) throw new JsonCanonicalizationError(path, "Input exceeds the maximum nesting depth.");
	if (value === null || typeof value === "boolean") return;
	if (typeof value === "string") {
		assertValidUnicodeScalarSequence(value, path);
		return;
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new JsonCanonicalizationError(path, "Numbers must be finite IEEE 754 values.");
		return;
	}
	if (typeof value !== "object") throw new JsonCanonicalizationError(path, "Input contains a non-JSON value.");
	if (ancestors.has(value)) throw new JsonCanonicalizationError(path, "Input contains a cyclic reference.");
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			assertIJsonArray(value, path, depth, ancestors);
			return;
		}
		assertIJsonObject(value, path, depth, ancestors);
	} finally {
		ancestors.delete(value);
	}
}
function assertIJsonArray(value, path, depth, ancestors) {
	const propertyNames = Object.getOwnPropertyNames(value);
	const expectedProperties = new Set(["length", ...value.map((_, index) => String(index))]);
	if (propertyNames.some((propertyName) => !expectedProperties.has(propertyName))) throw new JsonCanonicalizationError(path, "Arrays must not contain named properties.");
	if (Object.getOwnPropertySymbols(value).length > 0) throw new JsonCanonicalizationError(path, "Arrays must not contain symbol properties.");
	for (let index = 0; index < value.length; index += 1) {
		if (!Object.hasOwn(value, index)) throw new JsonCanonicalizationError(`${path}[${index}]`, "Arrays must not be sparse.");
		const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
		if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) throw new JsonCanonicalizationError(`${path}[${index}]`, "Array values must be enumerable data properties.");
		assertIJsonValue(descriptor.value, `${path}[${index}]`, depth + 1, ancestors);
	}
}
function assertIJsonObject(value, path, depth, ancestors) {
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) throw new JsonCanonicalizationError(path, "Objects must be plain JSON objects.");
	if (Object.getOwnPropertySymbols(value).length > 0) throw new JsonCanonicalizationError(path, "Objects must not contain symbol properties.");
	for (const propertyName of Object.getOwnPropertyNames(value)) {
		assertValidUnicodeScalarSequence(propertyName, path);
		const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
		if (descriptor === void 0 || !descriptor.enumerable || !("value" in descriptor)) throw new JsonCanonicalizationError(propertyPath(path, propertyName), "Object values must be enumerable data properties.");
		assertIJsonValue(descriptor.value, propertyPath(path, propertyName), depth + 1, ancestors);
	}
}
function assertValidUnicodeScalarSequence(value, path) {
	for (let index = 0; index < value.length; index += 1) {
		const codeUnit = value.charCodeAt(index);
		if (codeUnit >= 55296 && codeUnit <= 56319) {
			const nextCodeUnit = value.charCodeAt(index + 1);
			if (!(nextCodeUnit >= 56320 && nextCodeUnit <= 57343)) throw new JsonCanonicalizationError(path, "Strings must not contain lone surrogates.");
			index += 1;
			continue;
		}
		if (codeUnit >= 56320 && codeUnit <= 57343) throw new JsonCanonicalizationError(path, "Strings must not contain lone surrogates.");
	}
}
function propertyPath(parent, propertyName) {
	return `${parent}/${propertyName.replaceAll("~", "~0").replaceAll("/", "~1")}`;
}
//#endregion
//#region packages/capsule-core/dist/content-profile.js
var STATIC_IMAGE_PROFILE_ID = "ctx.content.static-image";
var STATIC_IMAGE_MEDIA_TYPES = Object.freeze([
	"image/jpeg",
	"image/png",
	"image/webp"
]);
var STATIC_IMAGE_MAX_WIDTH = 16384;
var STATIC_IMAGE_MAX_HEIGHT = 16384;
var ContentProfileValidationError = class extends Error {
	issues;
	constructor(issues) {
		super("Content profile declaration validation failed.");
		this.issues = issues;
		this.name = "ContentProfileValidationError";
	}
};
var UnsupportedContentProfileError = class extends Error {
	code = "unsupported_content_profile";
	constructor() {
		super("The requested content profile is not supported.");
		this.name = "UnsupportedContentProfileError";
	}
};
var DuplicateContentProfileError = class extends Error {
	code = "duplicate_content_profile";
	constructor() {
		super("A content profile identifier and version may be registered only once.");
		this.name = "DuplicateContentProfileError";
	}
};
var ContentProfileRegistry = class {
	profilesByIdentity;
	constructor(profiles) {
		const byIdentity = /* @__PURE__ */ new Map();
		for (const profile of profiles) {
			const identity = contentProfileIdentity(profile.id, profile.version);
			if (byIdentity.has(identity)) throw new DuplicateContentProfileError();
			byIdentity.set(identity, profile);
		}
		this.profilesByIdentity = byIdentity;
	}
	resolve(id, version) {
		if (typeof id !== "string" || typeof version !== "string") throw new UnsupportedContentProfileError();
		const profile = this.profilesByIdentity.get(contentProfileIdentity(id, version));
		if (profile === void 0) throw new UnsupportedContentProfileError();
		return profile;
	}
	list() {
		return Object.freeze([...this.profilesByIdentity.values()]);
	}
};
var StaticImageProfileV1 = class {
	id = STATIC_IMAGE_PROFILE_ID;
	version = "1.0";
	mediaTypes = STATIC_IMAGE_MEDIA_TYPES;
	validateDeclaration(declaration) {
		const issues = [];
		const { contentProfile, payload } = declaration;
		if (contentProfile.id !== "ctx.content.static-image" || contentProfile.version !== "1.0") issues.push({
			code: "unsupported_profile",
			path: "/content_profile",
			message: "must identify the supported V1 static-image profile"
		});
		if (!isStaticImageMediaType(payload.media_type)) issues.push({
			code: "unsupported_media_type",
			path: "/payloads/0/media_type",
			message: "must be a supported V1 static-image media type"
		});
		if (!Number.isSafeInteger(payload.plaintext_size) || payload.plaintext_size < 1) issues.push({
			code: "invalid_encoded_size",
			path: "/payloads/0/plaintext_size",
			message: "must be a positive safe integer byte length"
		});
		else if (payload.plaintext_size > 26214400) issues.push({
			code: "encoded_size_exceeded",
			path: "/payloads/0/plaintext_size",
			message: "exceeds the V1 static-image encoded-size limit"
		});
		validateDimension(payload.profile_metadata.width, STATIC_IMAGE_MAX_WIDTH, "/payloads/0/profile_metadata/width", issues);
		validateDimension(payload.profile_metadata.height, STATIC_IMAGE_MAX_HEIGHT, "/payloads/0/profile_metadata/height", issues);
		const { width, height, pixel_count: pixelCount } = payload.profile_metadata;
		const calculatedPixelCount = width * height;
		if (!Number.isSafeInteger(pixelCount) || pixelCount < 1) issues.push({
			code: "pixel_count_mismatch",
			path: "/payloads/0/profile_metadata/pixel_count",
			message: "must be a positive safe integer pixel count"
		});
		else {
			if (pixelCount !== calculatedPixelCount) issues.push({
				code: "pixel_count_mismatch",
				path: "/payloads/0/profile_metadata/pixel_count",
				message: "must equal width multiplied by height"
			});
			if (pixelCount > 4e7) issues.push({
				code: "pixel_count_exceeded",
				path: "/payloads/0/profile_metadata/pixel_count",
				message: "exceeds the V1 static-image pixel-count limit"
			});
		}
		const nominalDecodedRgbaBytes = pixelCount * 4;
		if (Number.isFinite(nominalDecodedRgbaBytes) && nominalDecodedRgbaBytes > 16e7) issues.push({
			code: "decoded_size_exceeded",
			path: "/payloads/0/profile_metadata/pixel_count",
			message: "exceeds the V1 nominal decoded RGBA byte limit"
		});
		if (issues.length > 0) throw new ContentProfileValidationError(issues);
		return Object.freeze({
			mediaType: payload.media_type,
			encodedBytes: payload.plaintext_size,
			width,
			height,
			pixelCount,
			nominalDecodedRgbaBytes
		});
	}
};
var STATIC_IMAGE_PROFILE_V1 = Object.freeze(new StaticImageProfileV1());
var TRUSTED_CONTENT_PROFILES = Object.freeze([STATIC_IMAGE_PROFILE_V1]);
var CONTENT_PROFILE_REGISTRY = Object.freeze(new ContentProfileRegistry(TRUSTED_CONTENT_PROFILES));
function resolveContentProfile(profileId, profileVersion) {
	return CONTENT_PROFILE_REGISTRY.resolve(profileId, profileVersion);
}
function isStaticImageMediaType(value) {
	return STATIC_IMAGE_MEDIA_TYPES.some((mediaType) => mediaType === value);
}
function validateDimension(value, maximum, path, issues) {
	if (!Number.isSafeInteger(value) || value < 1 || value > maximum) issues.push({
		code: "invalid_dimension",
		path,
		message: `must be an integer from 1 through ${maximum}`
	});
}
function contentProfileIdentity(id, version) {
	return `${id}\u0000${version}`;
}
//#endregion
//#region node_modules/ajv-formats/dist/formats.js
var require_formats = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.formatNames = exports.fastFormats = exports.fullFormats = void 0;
	function fmtDef(validate, compare) {
		return {
			validate,
			compare
		};
	}
	exports.fullFormats = {
		date: fmtDef(date, compareDate),
		time: fmtDef(getTime(true), compareTime),
		"date-time": fmtDef(getDateTime(true), compareDateTime),
		"iso-time": fmtDef(getTime(), compareIsoTime),
		"iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
		duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
		uri,
		"uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
		"uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
		url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
		email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
		hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
		ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
		ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
		regex,
		uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
		"json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
		"json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
		"relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
		byte,
		int32: {
			type: "number",
			validate: validateInt32
		},
		int64: {
			type: "number",
			validate: validateInt64
		},
		float: {
			type: "number",
			validate: validateNumber
		},
		double: {
			type: "number",
			validate: validateNumber
		},
		password: true,
		binary: true
	};
	exports.fastFormats = {
		...exports.fullFormats,
		date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
		time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
		"date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
		"iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
		"iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
		uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
		"uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
		email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
	};
	exports.formatNames = Object.keys(exports.fullFormats);
	function isLeapYear(year) {
		return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	}
	var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
	var DAYS = [
		0,
		31,
		28,
		31,
		30,
		31,
		30,
		31,
		31,
		30,
		31,
		30,
		31
	];
	function date(str) {
		const matches = DATE.exec(str);
		if (!matches) return false;
		const year = +matches[1];
		const month = +matches[2];
		const day = +matches[3];
		return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
	}
	function compareDate(d1, d2) {
		if (!(d1 && d2)) return void 0;
		if (d1 > d2) return 1;
		if (d1 < d2) return -1;
		return 0;
	}
	var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
	function getTime(strictTimeZone) {
		return function time(str) {
			const matches = TIME.exec(str);
			if (!matches) return false;
			const hr = +matches[1];
			const min = +matches[2];
			const sec = +matches[3];
			const tz = matches[4];
			const tzSign = matches[5] === "-" ? -1 : 1;
			const tzH = +(matches[6] || 0);
			const tzM = +(matches[7] || 0);
			if (tzH > 23 || tzM > 59 || strictTimeZone && !tz) return false;
			if (hr <= 23 && min <= 59 && sec < 60) return true;
			const utcMin = min - tzM * tzSign;
			const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
			return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
		};
	}
	function compareTime(s1, s2) {
		if (!(s1 && s2)) return void 0;
		const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
		const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
		if (!(t1 && t2)) return void 0;
		return t1 - t2;
	}
	function compareIsoTime(t1, t2) {
		if (!(t1 && t2)) return void 0;
		const a1 = TIME.exec(t1);
		const a2 = TIME.exec(t2);
		if (!(a1 && a2)) return void 0;
		t1 = a1[1] + a1[2] + a1[3];
		t2 = a2[1] + a2[2] + a2[3];
		if (t1 > t2) return 1;
		if (t1 < t2) return -1;
		return 0;
	}
	var DATE_TIME_SEPARATOR = /t|\s/i;
	function getDateTime(strictTimeZone) {
		const time = getTime(strictTimeZone);
		return function date_time(str) {
			const dateTime = str.split(DATE_TIME_SEPARATOR);
			return dateTime.length === 2 && date(dateTime[0]) && time(dateTime[1]);
		};
	}
	function compareDateTime(dt1, dt2) {
		if (!(dt1 && dt2)) return void 0;
		const d1 = new Date(dt1).valueOf();
		const d2 = new Date(dt2).valueOf();
		if (!(d1 && d2)) return void 0;
		return d1 - d2;
	}
	function compareIsoDateTime(dt1, dt2) {
		if (!(dt1 && dt2)) return void 0;
		const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
		const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
		const res = compareDate(d1, d2);
		if (res === void 0) return void 0;
		return res || compareTime(t1, t2);
	}
	var NOT_URI_FRAGMENT = /\/|:/;
	var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
	function uri(str) {
		return NOT_URI_FRAGMENT.test(str) && URI.test(str);
	}
	var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
	function byte(str) {
		BYTE.lastIndex = 0;
		return BYTE.test(str);
	}
	var MIN_INT32 = -(2 ** 31);
	var MAX_INT32 = 2 ** 31 - 1;
	function validateInt32(value) {
		return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
	}
	function validateInt64(value) {
		return Number.isInteger(value);
	}
	function validateNumber() {
		return true;
	}
	var Z_ANCHOR = /[^\\]\\Z/;
	function regex(str) {
		if (Z_ANCHOR.test(str)) return false;
		try {
			new RegExp(str);
			return true;
		} catch (e) {
			return false;
		}
	}
}));
//#endregion
//#region node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	function ucs2length(str) {
		const len = str.length;
		let length = 0;
		let pos = 0;
		let value;
		while (pos < len) {
			length++;
			value = str.charCodeAt(pos++);
			if (value >= 55296 && value <= 56319 && pos < len) {
				value = str.charCodeAt(pos);
				if ((value & 64512) === 56320) pos++;
			}
		}
		return length;
	}
	exports.default = ucs2length;
	ucs2length.code = "require(\"ajv/dist/runtime/ucs2length\").default";
}));
//#endregion
//#region node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function equal(a, b) {
		if (a === b) return true;
		if (a && b && typeof a == "object" && typeof b == "object") {
			if (a.constructor !== b.constructor) return false;
			var length, i, keys;
			if (Array.isArray(a)) {
				length = a.length;
				if (length != b.length) return false;
				for (i = length; i-- !== 0;) if (!equal(a[i], b[i])) return false;
				return true;
			}
			if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
			if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
			if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
			keys = Object.keys(a);
			length = keys.length;
			if (length !== Object.keys(b).length) return false;
			for (i = length; i-- !== 0;) if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
			for (i = length; i-- !== 0;) {
				var key = keys[i];
				if (!equal(a[key], b[key])) return false;
			}
			return true;
		}
		return a !== a && b !== b;
	};
}));
//#endregion
//#region node_modules/ajv/dist/runtime/equal.js
var require_equal = /* @__PURE__ */ __commonJSMin(((exports) => {
	Object.defineProperty(exports, "__esModule", { value: true });
	var equal = require_fast_deep_equal();
	equal.code = "require(\"ajv/dist/runtime/equal\").default";
	exports.default = equal;
}));
//#endregion
//#region packages/capsule-core/dist/generated/schema-validators.js
var import_formats = /* @__PURE__ */ __toESM(require_formats(), 1);
var import_ucs2length = /* @__PURE__ */ __toESM(require_ucs2length(), 1);
var import_equal = /* @__PURE__ */ __toESM(require_equal(), 1);
var unwrapDefault = (module) => {
	let value = module;
	while (value !== null && typeof value === "object" && "default" in value) value = value.default;
	return value;
};
var formats = unwrapDefault(import_formats.default);
var ucs2length = unwrapDefault(import_ucs2length.default);
unwrapDefault(import_equal.default);
var validatePolicySchema = validate20;
var formats0 = formats.fullFormats["date-time"];
var formats4 = formats.fullFormats.uri;
var pattern4 = /* @__PURE__ */ new RegExp("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$", "u");
function validate21(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
	let vErrors = null;
	let errors = 0;
	const evaluated0 = validate21.evaluated;
	if (evaluated0.dynamicProps) evaluated0.props = void 0;
	if (evaluated0.dynamicItems) evaluated0.items = void 0;
	if (data && typeof data == "object" && !Array.isArray(data)) {
		if (data.predicate === void 0) {
			const err0 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "predicate" },
				message: "must have required property 'predicate'"
			};
			if (vErrors === null) vErrors = [err0];
			else vErrors.push(err0);
			errors++;
		}
		if (data.scope === void 0) {
			const err1 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "scope" },
				message: "must have required property 'scope'"
			};
			if (vErrors === null) vErrors = [err1];
			else vErrors.push(err1);
			errors++;
		}
		if (data.maximum === void 0) {
			const err2 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "maximum" },
				message: "must have required property 'maximum'"
			};
			if (vErrors === null) vErrors = [err2];
			else vErrors.push(err2);
			errors++;
		}
		for (const key0 in data) if (!(key0 === "predicate" || key0 === "scope" || key0 === "maximum")) {
			const err3 = {
				instancePath,
				schemaPath: "#/additionalProperties",
				keyword: "additionalProperties",
				params: { additionalProperty: key0 },
				message: "must NOT have additional properties"
			};
			if (vErrors === null) vErrors = [err3];
			else vErrors.push(err3);
			errors++;
		}
		if (data.predicate !== void 0) {
			if ("ctx.usage.capsule-lifetime-limit" !== data.predicate) {
				const err4 = {
					instancePath: instancePath + "/predicate",
					schemaPath: "#/properties/predicate/const",
					keyword: "const",
					params: { allowedValue: "ctx.usage.capsule-lifetime-limit" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err4];
				else vErrors.push(err4);
				errors++;
			}
		}
		if (data.scope !== void 0) {
			if ("capsule" !== data.scope) {
				const err5 = {
					instancePath: instancePath + "/scope",
					schemaPath: "#/properties/scope/const",
					keyword: "const",
					params: { allowedValue: "capsule" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err5];
				else vErrors.push(err5);
				errors++;
			}
		}
		if (data.maximum !== void 0) {
			let data2 = data.maximum;
			if (!(typeof data2 == "number" && !(data2 % 1) && !isNaN(data2) && isFinite(data2))) {
				const err6 = {
					instancePath: instancePath + "/maximum",
					schemaPath: "#/$defs/limitMaximum/type",
					keyword: "type",
					params: { type: "integer" },
					message: "must be integer"
				};
				if (vErrors === null) vErrors = [err6];
				else vErrors.push(err6);
				errors++;
			}
			if (typeof data2 == "number" && isFinite(data2)) {
				if (data2 > 9007199254740991 || isNaN(data2)) {
					const err7 = {
						instancePath: instancePath + "/maximum",
						schemaPath: "#/$defs/limitMaximum/maximum",
						keyword: "maximum",
						params: {
							comparison: "<=",
							limit: 9007199254740991
						},
						message: "must be <= 9007199254740991"
					};
					if (vErrors === null) vErrors = [err7];
					else vErrors.push(err7);
					errors++;
				}
				if (data2 < 1 || isNaN(data2)) {
					const err8 = {
						instancePath: instancePath + "/maximum",
						schemaPath: "#/$defs/limitMaximum/minimum",
						keyword: "minimum",
						params: {
							comparison: ">=",
							limit: 1
						},
						message: "must be >= 1"
					};
					if (vErrors === null) vErrors = [err8];
					else vErrors.push(err8);
					errors++;
				}
			}
		}
	} else {
		const err9 = {
			instancePath,
			schemaPath: "#/type",
			keyword: "type",
			params: { type: "object" },
			message: "must be object"
		};
		if (vErrors === null) vErrors = [err9];
		else vErrors.push(err9);
		errors++;
	}
	validate21.errors = vErrors;
	return errors === 0;
}
validate21.evaluated = {
	props: true,
	dynamicProps: false,
	dynamicItems: false
};
function validate23(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
	let vErrors = null;
	let errors = 0;
	const evaluated0 = validate23.evaluated;
	if (evaluated0.dynamicProps) evaluated0.props = void 0;
	if (evaluated0.dynamicItems) evaluated0.items = void 0;
	if (data && typeof data == "object" && !Array.isArray(data)) {
		if (data.predicate === void 0) {
			const err0 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "predicate" },
				message: "must have required property 'predicate'"
			};
			if (vErrors === null) vErrors = [err0];
			else vErrors.push(err0);
			errors++;
		}
		if (data.scope === void 0) {
			const err1 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "scope" },
				message: "must have required property 'scope'"
			};
			if (vErrors === null) vErrors = [err1];
			else vErrors.push(err1);
			errors++;
		}
		if (data.maximum === void 0) {
			const err2 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "maximum" },
				message: "must have required property 'maximum'"
			};
			if (vErrors === null) vErrors = [err2];
			else vErrors.push(err2);
			errors++;
		}
		for (const key0 in data) if (!(key0 === "predicate" || key0 === "scope" || key0 === "maximum")) {
			const err3 = {
				instancePath,
				schemaPath: "#/additionalProperties",
				keyword: "additionalProperties",
				params: { additionalProperty: key0 },
				message: "must NOT have additional properties"
			};
			if (vErrors === null) vErrors = [err3];
			else vErrors.push(err3);
			errors++;
		}
		if (data.predicate !== void 0) {
			if ("ctx.usage.capsule-account-lifetime-limit" !== data.predicate) {
				const err4 = {
					instancePath: instancePath + "/predicate",
					schemaPath: "#/properties/predicate/const",
					keyword: "const",
					params: { allowedValue: "ctx.usage.capsule-account-lifetime-limit" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err4];
				else vErrors.push(err4);
				errors++;
			}
		}
		if (data.scope !== void 0) {
			if ("account-and-capsule" !== data.scope) {
				const err5 = {
					instancePath: instancePath + "/scope",
					schemaPath: "#/properties/scope/const",
					keyword: "const",
					params: { allowedValue: "account-and-capsule" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err5];
				else vErrors.push(err5);
				errors++;
			}
		}
		if (data.maximum !== void 0) {
			let data2 = data.maximum;
			if (!(typeof data2 == "number" && !(data2 % 1) && !isNaN(data2) && isFinite(data2))) {
				const err6 = {
					instancePath: instancePath + "/maximum",
					schemaPath: "#/$defs/limitMaximum/type",
					keyword: "type",
					params: { type: "integer" },
					message: "must be integer"
				};
				if (vErrors === null) vErrors = [err6];
				else vErrors.push(err6);
				errors++;
			}
			if (typeof data2 == "number" && isFinite(data2)) {
				if (data2 > 9007199254740991 || isNaN(data2)) {
					const err7 = {
						instancePath: instancePath + "/maximum",
						schemaPath: "#/$defs/limitMaximum/maximum",
						keyword: "maximum",
						params: {
							comparison: "<=",
							limit: 9007199254740991
						},
						message: "must be <= 9007199254740991"
					};
					if (vErrors === null) vErrors = [err7];
					else vErrors.push(err7);
					errors++;
				}
				if (data2 < 1 || isNaN(data2)) {
					const err8 = {
						instancePath: instancePath + "/maximum",
						schemaPath: "#/$defs/limitMaximum/minimum",
						keyword: "minimum",
						params: {
							comparison: ">=",
							limit: 1
						},
						message: "must be >= 1"
					};
					if (vErrors === null) vErrors = [err8];
					else vErrors.push(err8);
					errors++;
				}
			}
		}
	} else {
		const err9 = {
			instancePath,
			schemaPath: "#/type",
			keyword: "type",
			params: { type: "object" },
			message: "must be object"
		};
		if (vErrors === null) vErrors = [err9];
		else vErrors.push(err9);
		errors++;
	}
	validate23.errors = vErrors;
	return errors === 0;
}
validate23.evaluated = {
	props: true,
	dynamicProps: false,
	dynamicItems: false
};
var func1 = ucs2length;
function validate20(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
	let vErrors = null;
	let errors = 0;
	const evaluated0 = validate20.evaluated;
	if (evaluated0.dynamicProps) evaluated0.props = void 0;
	if (evaluated0.dynamicItems) evaluated0.items = void 0;
	if (data && typeof data == "object" && !Array.isArray(data)) {
		if (data.type === void 0) {
			const err0 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "type" },
				message: "must have required property 'type'"
			};
			if (vErrors === null) vErrors = [err0];
			else vErrors.push(err0);
			errors++;
		}
		if (data.version === void 0) {
			const err1 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "version" },
				message: "must have required property 'version'"
			};
			if (vErrors === null) vErrors = [err1];
			else vErrors.push(err1);
			errors++;
		}
		if (data.combiner === void 0) {
			const err2 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "combiner" },
				message: "must have required property 'combiner'"
			};
			if (vErrors === null) vErrors = [err2];
			else vErrors.push(err2);
			errors++;
		}
		if (data.requirements === void 0) {
			const err3 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "requirements" },
				message: "must have required property 'requirements'"
			};
			if (vErrors === null) vErrors = [err3];
			else vErrors.push(err3);
			errors++;
		}
		for (const key0 in data) if (!(key0 === "type" || key0 === "version" || key0 === "combiner" || key0 === "requirements")) {
			const err4 = {
				instancePath,
				schemaPath: "#/additionalProperties",
				keyword: "additionalProperties",
				params: { additionalProperty: key0 },
				message: "must NOT have additional properties"
			};
			if (vErrors === null) vErrors = [err4];
			else vErrors.push(err4);
			errors++;
		}
		if (data.type !== void 0) {
			if ("ctx-policy" !== data.type) {
				const err5 = {
					instancePath: instancePath + "/type",
					schemaPath: "#/properties/type/const",
					keyword: "const",
					params: { allowedValue: "ctx-policy" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err5];
				else vErrors.push(err5);
				errors++;
			}
		}
		if (data.version !== void 0) {
			if (1 !== data.version) {
				const err6 = {
					instancePath: instancePath + "/version",
					schemaPath: "#/properties/version/const",
					keyword: "const",
					params: { allowedValue: 1 },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err6];
				else vErrors.push(err6);
				errors++;
			}
		}
		if (data.combiner !== void 0) {
			if ("all" !== data.combiner) {
				const err7 = {
					instancePath: instancePath + "/combiner",
					schemaPath: "#/properties/combiner/const",
					keyword: "const",
					params: { allowedValue: "all" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err7];
				else vErrors.push(err7);
				errors++;
			}
		}
		if (data.requirements !== void 0) {
			let data3 = data.requirements;
			if (Array.isArray(data3)) {
				if (data3.length > 8) {
					const err8 = {
						instancePath: instancePath + "/requirements",
						schemaPath: "#/properties/requirements/maxItems",
						keyword: "maxItems",
						params: { limit: 8 },
						message: "must NOT have more than 8 items"
					};
					if (vErrors === null) vErrors = [err8];
					else vErrors.push(err8);
					errors++;
				}
				if (data3.length < 4) {
					const err9 = {
						instancePath: instancePath + "/requirements",
						schemaPath: "#/properties/requirements/minItems",
						keyword: "minItems",
						params: { limit: 4 },
						message: "must NOT have fewer than 4 items"
					};
					if (vErrors === null) vErrors = [err9];
					else vErrors.push(err9);
					errors++;
				}
				const len0 = data3.length;
				for (let i0 = 0; i0 < len0; i0++) {
					let data4 = data3[i0];
					const _errs8 = errors;
					let valid3 = false;
					let passing0 = null;
					const _errs9 = errors;
					if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
						if (data4.predicate === void 0) {
							const err10 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/emailVerified/required",
								keyword: "required",
								params: { missingProperty: "predicate" },
								message: "must have required property 'predicate'"
							};
							if (vErrors === null) vErrors = [err10];
							else vErrors.push(err10);
							errors++;
						}
						if (data4.equals === void 0) {
							const err11 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/emailVerified/required",
								keyword: "required",
								params: { missingProperty: "equals" },
								message: "must have required property 'equals'"
							};
							if (vErrors === null) vErrors = [err11];
							else vErrors.push(err11);
							errors++;
						}
						for (const key1 in data4) if (!(key1 === "predicate" || key1 === "equals")) {
							const err12 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/emailVerified/additionalProperties",
								keyword: "additionalProperties",
								params: { additionalProperty: key1 },
								message: "must NOT have additional properties"
							};
							if (vErrors === null) vErrors = [err12];
							else vErrors.push(err12);
							errors++;
						}
						if (data4.predicate !== void 0) {
							if ("ctx.account.email-verified" !== data4.predicate) {
								const err13 = {
									instancePath: instancePath + "/requirements/" + i0 + "/predicate",
									schemaPath: "#/$defs/emailVerified/properties/predicate/const",
									keyword: "const",
									params: { allowedValue: "ctx.account.email-verified" },
									message: "must be equal to constant"
								};
								if (vErrors === null) vErrors = [err13];
								else vErrors.push(err13);
								errors++;
							}
						}
						if (data4.equals !== void 0) {
							if (true !== data4.equals) {
								const err14 = {
									instancePath: instancePath + "/requirements/" + i0 + "/equals",
									schemaPath: "#/$defs/emailVerified/properties/equals/const",
									keyword: "const",
									params: { allowedValue: true },
									message: "must be equal to constant"
								};
								if (vErrors === null) vErrors = [err14];
								else vErrors.push(err14);
								errors++;
							}
						}
					} else {
						const err15 = {
							instancePath: instancePath + "/requirements/" + i0,
							schemaPath: "#/$defs/emailVerified/type",
							keyword: "type",
							params: { type: "object" },
							message: "must be object"
						};
						if (vErrors === null) vErrors = [err15];
						else vErrors.push(err15);
						errors++;
					}
					var _valid0 = _errs9 === errors;
					if (_valid0) {
						valid3 = true;
						passing0 = 0;
						var props0 = true;
					}
					const _errs15 = errors;
					if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
						if (data4.predicate === void 0) {
							const err16 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/accountActive/required",
								keyword: "required",
								params: { missingProperty: "predicate" },
								message: "must have required property 'predicate'"
							};
							if (vErrors === null) vErrors = [err16];
							else vErrors.push(err16);
							errors++;
						}
						if (data4.equals === void 0) {
							const err17 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/accountActive/required",
								keyword: "required",
								params: { missingProperty: "equals" },
								message: "must have required property 'equals'"
							};
							if (vErrors === null) vErrors = [err17];
							else vErrors.push(err17);
							errors++;
						}
						for (const key2 in data4) if (!(key2 === "predicate" || key2 === "equals")) {
							const err18 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/accountActive/additionalProperties",
								keyword: "additionalProperties",
								params: { additionalProperty: key2 },
								message: "must NOT have additional properties"
							};
							if (vErrors === null) vErrors = [err18];
							else vErrors.push(err18);
							errors++;
						}
						if (data4.predicate !== void 0) {
							if ("ctx.account.active" !== data4.predicate) {
								const err19 = {
									instancePath: instancePath + "/requirements/" + i0 + "/predicate",
									schemaPath: "#/$defs/accountActive/properties/predicate/const",
									keyword: "const",
									params: { allowedValue: "ctx.account.active" },
									message: "must be equal to constant"
								};
								if (vErrors === null) vErrors = [err19];
								else vErrors.push(err19);
								errors++;
							}
						}
						if (data4.equals !== void 0) {
							if (true !== data4.equals) {
								const err20 = {
									instancePath: instancePath + "/requirements/" + i0 + "/equals",
									schemaPath: "#/$defs/accountActive/properties/equals/const",
									keyword: "const",
									params: { allowedValue: true },
									message: "must be equal to constant"
								};
								if (vErrors === null) vErrors = [err20];
								else vErrors.push(err20);
								errors++;
							}
						}
					} else {
						const err21 = {
							instancePath: instancePath + "/requirements/" + i0,
							schemaPath: "#/$defs/accountActive/type",
							keyword: "type",
							params: { type: "object" },
							message: "must be object"
						};
						if (vErrors === null) vErrors = [err21];
						else vErrors.push(err21);
						errors++;
					}
					var _valid0 = _errs15 === errors;
					if (_valid0 && valid3) {
						valid3 = false;
						passing0 = [passing0, 1];
					} else {
						if (_valid0) {
							valid3 = true;
							passing0 = 1;
							if (props0 !== true) props0 = true;
						}
						const _errs21 = errors;
						if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
							if (data4.predicate === void 0) {
								const err22 = {
									instancePath: instancePath + "/requirements/" + i0,
									schemaPath: "#/$defs/deviceRegistered/required",
									keyword: "required",
									params: { missingProperty: "predicate" },
									message: "must have required property 'predicate'"
								};
								if (vErrors === null) vErrors = [err22];
								else vErrors.push(err22);
								errors++;
							}
							if (data4.equals === void 0) {
								const err23 = {
									instancePath: instancePath + "/requirements/" + i0,
									schemaPath: "#/$defs/deviceRegistered/required",
									keyword: "required",
									params: { missingProperty: "equals" },
									message: "must have required property 'equals'"
								};
								if (vErrors === null) vErrors = [err23];
								else vErrors.push(err23);
								errors++;
							}
							for (const key3 in data4) if (!(key3 === "predicate" || key3 === "equals")) {
								const err24 = {
									instancePath: instancePath + "/requirements/" + i0,
									schemaPath: "#/$defs/deviceRegistered/additionalProperties",
									keyword: "additionalProperties",
									params: { additionalProperty: key3 },
									message: "must NOT have additional properties"
								};
								if (vErrors === null) vErrors = [err24];
								else vErrors.push(err24);
								errors++;
							}
							if (data4.predicate !== void 0) {
								if ("ctx.viewer.device-registered" !== data4.predicate) {
									const err25 = {
										instancePath: instancePath + "/requirements/" + i0 + "/predicate",
										schemaPath: "#/$defs/deviceRegistered/properties/predicate/const",
										keyword: "const",
										params: { allowedValue: "ctx.viewer.device-registered" },
										message: "must be equal to constant"
									};
									if (vErrors === null) vErrors = [err25];
									else vErrors.push(err25);
									errors++;
								}
							}
							if (data4.equals !== void 0) {
								if (true !== data4.equals) {
									const err26 = {
										instancePath: instancePath + "/requirements/" + i0 + "/equals",
										schemaPath: "#/$defs/deviceRegistered/properties/equals/const",
										keyword: "const",
										params: { allowedValue: true },
										message: "must be equal to constant"
									};
									if (vErrors === null) vErrors = [err26];
									else vErrors.push(err26);
									errors++;
								}
							}
						} else {
							const err27 = {
								instancePath: instancePath + "/requirements/" + i0,
								schemaPath: "#/$defs/deviceRegistered/type",
								keyword: "type",
								params: { type: "object" },
								message: "must be object"
							};
							if (vErrors === null) vErrors = [err27];
							else vErrors.push(err27);
							errors++;
						}
						var _valid0 = _errs21 === errors;
						if (_valid0 && valid3) {
							valid3 = false;
							passing0 = [passing0, 2];
						} else {
							if (_valid0) {
								valid3 = true;
								passing0 = 2;
								if (props0 !== true) props0 = true;
							}
							const _errs27 = errors;
							if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
								if (data4.predicate === void 0) {
									const err28 = {
										instancePath: instancePath + "/requirements/" + i0,
										schemaPath: "#/$defs/viewEventConsent/required",
										keyword: "required",
										params: { missingProperty: "predicate" },
										message: "must have required property 'predicate'"
									};
									if (vErrors === null) vErrors = [err28];
									else vErrors.push(err28);
									errors++;
								}
								if (data4.equals === void 0) {
									const err29 = {
										instancePath: instancePath + "/requirements/" + i0,
										schemaPath: "#/$defs/viewEventConsent/required",
										keyword: "required",
										params: { missingProperty: "equals" },
										message: "must have required property 'equals'"
									};
									if (vErrors === null) vErrors = [err29];
									else vErrors.push(err29);
									errors++;
								}
								for (const key4 in data4) if (!(key4 === "predicate" || key4 === "equals")) {
									const err30 = {
										instancePath: instancePath + "/requirements/" + i0,
										schemaPath: "#/$defs/viewEventConsent/additionalProperties",
										keyword: "additionalProperties",
										params: { additionalProperty: key4 },
										message: "must NOT have additional properties"
									};
									if (vErrors === null) vErrors = [err30];
									else vErrors.push(err30);
									errors++;
								}
								if (data4.predicate !== void 0) {
									if ("ctx.consent.capsule-view-event" !== data4.predicate) {
										const err31 = {
											instancePath: instancePath + "/requirements/" + i0 + "/predicate",
											schemaPath: "#/$defs/viewEventConsent/properties/predicate/const",
											keyword: "const",
											params: { allowedValue: "ctx.consent.capsule-view-event" },
											message: "must be equal to constant"
										};
										if (vErrors === null) vErrors = [err31];
										else vErrors.push(err31);
										errors++;
									}
								}
								if (data4.equals !== void 0) {
									if (true !== data4.equals) {
										const err32 = {
											instancePath: instancePath + "/requirements/" + i0 + "/equals",
											schemaPath: "#/$defs/viewEventConsent/properties/equals/const",
											keyword: "const",
											params: { allowedValue: true },
											message: "must be equal to constant"
										};
										if (vErrors === null) vErrors = [err32];
										else vErrors.push(err32);
										errors++;
									}
								}
							} else {
								const err33 = {
									instancePath: instancePath + "/requirements/" + i0,
									schemaPath: "#/$defs/viewEventConsent/type",
									keyword: "type",
									params: { type: "object" },
									message: "must be object"
								};
								if (vErrors === null) vErrors = [err33];
								else vErrors.push(err33);
								errors++;
							}
							var _valid0 = _errs27 === errors;
							if (_valid0 && valid3) {
								valid3 = false;
								passing0 = [passing0, 3];
							} else {
								if (_valid0) {
									valid3 = true;
									passing0 = 3;
									if (props0 !== true) props0 = true;
								}
								const _errs33 = errors;
								if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
									if (Object.keys(data4).length < 2) {
										const err34 = {
											instancePath: instancePath + "/requirements/" + i0,
											schemaPath: "#/$defs/capsuleAccessWindow/minProperties",
											keyword: "minProperties",
											params: { limit: 2 },
											message: "must NOT have fewer than 2 properties"
										};
										if (vErrors === null) vErrors = [err34];
										else vErrors.push(err34);
										errors++;
									}
									if (data4.predicate === void 0) {
										const err35 = {
											instancePath: instancePath + "/requirements/" + i0,
											schemaPath: "#/$defs/capsuleAccessWindow/required",
											keyword: "required",
											params: { missingProperty: "predicate" },
											message: "must have required property 'predicate'"
										};
										if (vErrors === null) vErrors = [err35];
										else vErrors.push(err35);
										errors++;
									}
									for (const key5 in data4) if (!(key5 === "predicate" || key5 === "not_before" || key5 === "not_after")) {
										const err36 = {
											instancePath: instancePath + "/requirements/" + i0,
											schemaPath: "#/$defs/capsuleAccessWindow/additionalProperties",
											keyword: "additionalProperties",
											params: { additionalProperty: key5 },
											message: "must NOT have additional properties"
										};
										if (vErrors === null) vErrors = [err36];
										else vErrors.push(err36);
										errors++;
									}
									if (data4.predicate !== void 0) {
										if ("ctx.time.capsule-access-window" !== data4.predicate) {
											const err37 = {
												instancePath: instancePath + "/requirements/" + i0 + "/predicate",
												schemaPath: "#/$defs/capsuleAccessWindow/properties/predicate/const",
												keyword: "const",
												params: { allowedValue: "ctx.time.capsule-access-window" },
												message: "must be equal to constant"
											};
											if (vErrors === null) vErrors = [err37];
											else vErrors.push(err37);
											errors++;
										}
									}
									if (data4.not_before !== void 0) {
										let data14 = data4.not_before;
										if (typeof data14 === "string") {
											if (!pattern4.test(data14)) {
												const err38 = {
													instancePath: instancePath + "/requirements/" + i0 + "/not_before",
													schemaPath: "#/$defs/capsuleAccessWindow/properties/not_before/pattern",
													keyword: "pattern",
													params: { pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$" },
													message: "must match pattern \"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$\""
												};
												if (vErrors === null) vErrors = [err38];
												else vErrors.push(err38);
												errors++;
											}
											if (!formats0.validate(data14)) {
												const err39 = {
													instancePath: instancePath + "/requirements/" + i0 + "/not_before",
													schemaPath: "#/$defs/capsuleAccessWindow/properties/not_before/format",
													keyword: "format",
													params: { format: "date-time" },
													message: "must match format \"date-time\""
												};
												if (vErrors === null) vErrors = [err39];
												else vErrors.push(err39);
												errors++;
											}
										} else {
											const err40 = {
												instancePath: instancePath + "/requirements/" + i0 + "/not_before",
												schemaPath: "#/$defs/capsuleAccessWindow/properties/not_before/type",
												keyword: "type",
												params: { type: "string" },
												message: "must be string"
											};
											if (vErrors === null) vErrors = [err40];
											else vErrors.push(err40);
											errors++;
										}
									}
									if (data4.not_after !== void 0) {
										let data15 = data4.not_after;
										if (typeof data15 === "string") {
											if (!pattern4.test(data15)) {
												const err41 = {
													instancePath: instancePath + "/requirements/" + i0 + "/not_after",
													schemaPath: "#/$defs/capsuleAccessWindow/properties/not_after/pattern",
													keyword: "pattern",
													params: { pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$" },
													message: "must match pattern \"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$\""
												};
												if (vErrors === null) vErrors = [err41];
												else vErrors.push(err41);
												errors++;
											}
											if (!formats0.validate(data15)) {
												const err42 = {
													instancePath: instancePath + "/requirements/" + i0 + "/not_after",
													schemaPath: "#/$defs/capsuleAccessWindow/properties/not_after/format",
													keyword: "format",
													params: { format: "date-time" },
													message: "must match format \"date-time\""
												};
												if (vErrors === null) vErrors = [err42];
												else vErrors.push(err42);
												errors++;
											}
										} else {
											const err43 = {
												instancePath: instancePath + "/requirements/" + i0 + "/not_after",
												schemaPath: "#/$defs/capsuleAccessWindow/properties/not_after/type",
												keyword: "type",
												params: { type: "string" },
												message: "must be string"
											};
											if (vErrors === null) vErrors = [err43];
											else vErrors.push(err43);
											errors++;
										}
									}
								} else {
									const err44 = {
										instancePath: instancePath + "/requirements/" + i0,
										schemaPath: "#/$defs/capsuleAccessWindow/type",
										keyword: "type",
										params: { type: "object" },
										message: "must be object"
									};
									if (vErrors === null) vErrors = [err44];
									else vErrors.push(err44);
									errors++;
								}
								var _valid0 = _errs33 === errors;
								if (_valid0 && valid3) {
									valid3 = false;
									passing0 = [passing0, 4];
								} else {
									if (_valid0) {
										valid3 = true;
										passing0 = 4;
										if (props0 !== true) props0 = true;
									}
									const _errs42 = errors;
									if (!validate21(data4, {
										instancePath: instancePath + "/requirements/" + i0,
										parentData: data3,
										parentDataProperty: i0,
										rootData,
										dynamicAnchors
									})) {
										vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
										errors = vErrors.length;
									}
									var _valid0 = _errs42 === errors;
									if (_valid0 && valid3) {
										valid3 = false;
										passing0 = [passing0, 5];
									} else {
										if (_valid0) {
											valid3 = true;
											passing0 = 5;
											if (props0 !== true) props0 = true;
										}
										const _errs43 = errors;
										if (!validate23(data4, {
											instancePath: instancePath + "/requirements/" + i0,
											parentData: data3,
											parentDataProperty: i0,
											rootData,
											dynamicAnchors
										})) {
											vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
											errors = vErrors.length;
										}
										var _valid0 = _errs43 === errors;
										if (_valid0 && valid3) {
											valid3 = false;
											passing0 = [passing0, 6];
										} else {
											if (_valid0) {
												valid3 = true;
												passing0 = 6;
												if (props0 !== true) props0 = true;
											}
											const _errs44 = errors;
											if (data4 && typeof data4 == "object" && !Array.isArray(data4)) {
												if (data4.predicate === void 0) {
													const err45 = {
														instancePath: instancePath + "/requirements/" + i0,
														schemaPath: "#/$defs/automationRiskNotHigh/required",
														keyword: "required",
														params: { missingProperty: "predicate" },
														message: "must have required property 'predicate'"
													};
													if (vErrors === null) vErrors = [err45];
													else vErrors.push(err45);
													errors++;
												}
												if (data4.issuer === void 0) {
													const err46 = {
														instancePath: instancePath + "/requirements/" + i0,
														schemaPath: "#/$defs/automationRiskNotHigh/required",
														keyword: "required",
														params: { missingProperty: "issuer" },
														message: "must have required property 'issuer'"
													};
													if (vErrors === null) vErrors = [err46];
													else vErrors.push(err46);
													errors++;
												}
												for (const key6 in data4) if (!(key6 === "predicate" || key6 === "issuer")) {
													const err47 = {
														instancePath: instancePath + "/requirements/" + i0,
														schemaPath: "#/$defs/automationRiskNotHigh/additionalProperties",
														keyword: "additionalProperties",
														params: { additionalProperty: key6 },
														message: "must NOT have additional properties"
													};
													if (vErrors === null) vErrors = [err47];
													else vErrors.push(err47);
													errors++;
												}
												if (data4.predicate !== void 0) {
													if ("ctx.risk.ecosystem-automation-not-high" !== data4.predicate) {
														const err48 = {
															instancePath: instancePath + "/requirements/" + i0 + "/predicate",
															schemaPath: "#/$defs/automationRiskNotHigh/properties/predicate/const",
															keyword: "const",
															params: { allowedValue: "ctx.risk.ecosystem-automation-not-high" },
															message: "must be equal to constant"
														};
														if (vErrors === null) vErrors = [err48];
														else vErrors.push(err48);
														errors++;
													}
												}
												if (data4.issuer !== void 0) {
													let data17 = data4.issuer;
													if (typeof data17 === "string") {
														if (func1(data17) > 2048) {
															const err49 = {
																instancePath: instancePath + "/requirements/" + i0 + "/issuer",
																schemaPath: "#/$defs/automationRiskNotHigh/properties/issuer/maxLength",
																keyword: "maxLength",
																params: { limit: 2048 },
																message: "must NOT have more than 2048 characters"
															};
															if (vErrors === null) vErrors = [err49];
															else vErrors.push(err49);
															errors++;
														}
														if (!formats4(data17)) {
															const err50 = {
																instancePath: instancePath + "/requirements/" + i0 + "/issuer",
																schemaPath: "#/$defs/automationRiskNotHigh/properties/issuer/format",
																keyword: "format",
																params: { format: "uri" },
																message: "must match format \"uri\""
															};
															if (vErrors === null) vErrors = [err50];
															else vErrors.push(err50);
															errors++;
														}
													} else {
														const err51 = {
															instancePath: instancePath + "/requirements/" + i0 + "/issuer",
															schemaPath: "#/$defs/automationRiskNotHigh/properties/issuer/type",
															keyword: "type",
															params: { type: "string" },
															message: "must be string"
														};
														if (vErrors === null) vErrors = [err51];
														else vErrors.push(err51);
														errors++;
													}
												}
											} else {
												const err52 = {
													instancePath: instancePath + "/requirements/" + i0,
													schemaPath: "#/$defs/automationRiskNotHigh/type",
													keyword: "type",
													params: { type: "object" },
													message: "must be object"
												};
												if (vErrors === null) vErrors = [err52];
												else vErrors.push(err52);
												errors++;
											}
											var _valid0 = _errs44 === errors;
											if (_valid0 && valid3) {
												valid3 = false;
												passing0 = [passing0, 7];
											} else if (_valid0) {
												valid3 = true;
												passing0 = 7;
												if (props0 !== true) props0 = true;
											}
										}
									}
								}
							}
						}
					}
					if (!valid3) {
						const err53 = {
							instancePath: instancePath + "/requirements/" + i0,
							schemaPath: "#/properties/requirements/items/oneOf",
							keyword: "oneOf",
							params: { passingSchemas: passing0 },
							message: "must match exactly one schema in oneOf"
						};
						if (vErrors === null) vErrors = [err53];
						else vErrors.push(err53);
						errors++;
					} else {
						errors = _errs8;
						if (vErrors !== null) if (_errs8) vErrors.length = _errs8;
						else vErrors = null;
					}
				}
			} else {
				const err54 = {
					instancePath: instancePath + "/requirements",
					schemaPath: "#/properties/requirements/type",
					keyword: "type",
					params: { type: "array" },
					message: "must be array"
				};
				if (vErrors === null) vErrors = [err54];
				else vErrors.push(err54);
				errors++;
			}
		}
	} else {
		const err55 = {
			instancePath,
			schemaPath: "#/type",
			keyword: "type",
			params: { type: "object" },
			message: "must be object"
		};
		if (vErrors === null) vErrors = [err55];
		else vErrors.push(err55);
		errors++;
	}
	validate20.errors = vErrors;
	return errors === 0;
}
validate20.evaluated = {
	props: true,
	dynamicProps: false,
	dynamicItems: false
};
var validateManifestSchema = validate25;
var schema42 = {
	$schema: "https://json-schema.org/draft/2020-12/schema",
	$id: "https://sharecapsules.com/specifications/capsule/manifest-v1.schema.json",
	title: "Capsule Manifest V1",
	type: "object",
	additionalProperties: false,
	required: [
		"type",
		"format_version",
		"capsule",
		"cryptographic_suite",
		"creator",
		"content_profile",
		"policy",
		"ctx",
		"payloads"
	],
	properties: {
		type: { const: "capsule-manifest" },
		format_version: { const: "1.0" },
		capsule: {
			type: "object",
			additionalProperties: false,
			required: [
				"id",
				"revision",
				"created_at"
			],
			properties: {
				id: { $ref: "#/$defs/capsuleId" },
				revision: {
					type: "integer",
					minimum: 1,
					maximum: 2147483647
				},
				created_at: {
					type: "string",
					format: "date-time"
				},
				predecessor: {
					type: "object",
					additionalProperties: false,
					required: [
						"id",
						"revision",
						"manifest_sha256"
					],
					properties: {
						id: { $ref: "#/$defs/capsuleId" },
						revision: {
							type: "integer",
							minimum: 1,
							maximum: 2147483647
						},
						manifest_sha256: { $ref: "#/$defs/sha256" }
					}
				}
			}
		},
		cryptographic_suite: { const: "ctx-capsule-v1" },
		creator: {
			type: "object",
			additionalProperties: false,
			required: ["signing_key"],
			properties: { signing_key: {
				type: "object",
				additionalProperties: false,
				required: [
					"id",
					"algorithm",
					"public_key"
				],
				properties: {
					id: { $ref: "#/$defs/opaqueId" },
					algorithm: { const: "Ed25519" },
					public_key: {
						type: "string",
						pattern: "^[A-Za-z0-9_-]{43}$"
					}
				}
			} }
		},
		content_profile: {
			type: "object",
			additionalProperties: false,
			required: ["id", "version"],
			properties: {
				id: { const: "ctx.content.static-image" },
				version: { const: "1.0" }
			}
		},
		description: {
			type: "object",
			additionalProperties: false,
			properties: {
				title: {
					type: "string",
					minLength: 1,
					maxLength: 200
				},
				description: {
					type: "string",
					minLength: 1,
					maxLength: 2e3
				},
				creator_display_name: {
					type: "string",
					minLength: 1,
					maxLength: 200
				},
				original_filename: {
					type: "string",
					minLength: 1,
					maxLength: 255
				}
			},
			minProperties: 1
		},
		policy: { $ref: "https://sharecapsules.com/specifications/ctx/policy-v1.schema.json" },
		ctx: {
			type: "object",
			additionalProperties: false,
			required: ["issuer"],
			properties: { issuer: {
				type: "string",
				format: "uri",
				maxLength: 2048,
				pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))"
			} }
		},
		payloads: {
			type: "array",
			minItems: 1,
			maxItems: 1,
			items: {
				type: "object",
				additionalProperties: false,
				required: [
					"id",
					"path",
					"media_type",
					"plaintext_size",
					"ciphertext_size",
					"ciphertext_sha256",
					"encryption",
					"key_release",
					"profile_metadata"
				],
				properties: {
					id: { $ref: "#/$defs/payloadId" },
					path: {
						type: "string",
						pattern: "^payloads/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.enc$",
						maxLength: 77
					},
					media_type: { enum: [
						"image/jpeg",
						"image/png",
						"image/webp"
					] },
					plaintext_size: {
						type: "integer",
						minimum: 1,
						maximum: 26214400
					},
					ciphertext_size: {
						type: "integer",
						minimum: 17,
						maximum: 26214416
					},
					ciphertext_sha256: { $ref: "#/$defs/sha256" },
					encryption: {
						type: "object",
						additionalProperties: false,
						required: ["representation", "nonce"],
						properties: {
							representation: { const: "whole" },
							nonce: {
								type: "string",
								pattern: "^[A-Za-z0-9_-]{16}$"
							}
						}
					},
					key_release: {
						type: "object",
						additionalProperties: false,
						required: ["broker", "handle"],
						properties: {
							broker: {
								type: "string",
								format: "uri",
								maxLength: 2048,
								pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))"
							},
							handle: { $ref: "#/$defs/opaqueId" }
						}
					},
					profile_metadata: {
						type: "object",
						additionalProperties: false,
						required: [
							"width",
							"height",
							"pixel_count"
						],
						properties: {
							width: {
								type: "integer",
								minimum: 1,
								maximum: 16384
							},
							height: {
								type: "integer",
								minimum: 1,
								maximum: 16384
							},
							pixel_count: {
								type: "integer",
								minimum: 1,
								maximum: 4e7
							}
						}
					}
				}
			}
		}
	},
	$defs: {
		capsuleId: {
			type: "string",
			pattern: "^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
		},
		opaqueId: {
			type: "string",
			minLength: 16,
			maxLength: 128,
			pattern: "^[A-Za-z0-9_-]+$"
		},
		payloadId: {
			type: "string",
			minLength: 1,
			maxLength: 64,
			pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$"
		},
		sha256: {
			type: "string",
			pattern: "^[A-Za-z0-9_-]{43}$"
		}
	}
};
var func2 = Object.prototype.hasOwnProperty;
var pattern6 = /* @__PURE__ */ new RegExp("^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "u");
var pattern8 = /* @__PURE__ */ new RegExp("^[A-Za-z0-9_-]{43}$", "u");
var pattern9 = /* @__PURE__ */ new RegExp("^[A-Za-z0-9_-]+$", "u");
var pattern11 = /* @__PURE__ */ new RegExp("^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))", "u");
var pattern12 = /* @__PURE__ */ new RegExp("^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$", "u");
var pattern13 = /* @__PURE__ */ new RegExp("^payloads/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.enc$", "u");
var pattern15 = /* @__PURE__ */ new RegExp("^[A-Za-z0-9_-]{16}$", "u");
function validate25(data, { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {}) {
	let vErrors = null;
	let errors = 0;
	const evaluated0 = validate25.evaluated;
	if (evaluated0.dynamicProps) evaluated0.props = void 0;
	if (evaluated0.dynamicItems) evaluated0.items = void 0;
	if (data && typeof data == "object" && !Array.isArray(data)) {
		if (data.type === void 0) {
			const err0 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "type" },
				message: "must have required property 'type'"
			};
			if (vErrors === null) vErrors = [err0];
			else vErrors.push(err0);
			errors++;
		}
		if (data.format_version === void 0) {
			const err1 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "format_version" },
				message: "must have required property 'format_version'"
			};
			if (vErrors === null) vErrors = [err1];
			else vErrors.push(err1);
			errors++;
		}
		if (data.capsule === void 0) {
			const err2 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "capsule" },
				message: "must have required property 'capsule'"
			};
			if (vErrors === null) vErrors = [err2];
			else vErrors.push(err2);
			errors++;
		}
		if (data.cryptographic_suite === void 0) {
			const err3 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "cryptographic_suite" },
				message: "must have required property 'cryptographic_suite'"
			};
			if (vErrors === null) vErrors = [err3];
			else vErrors.push(err3);
			errors++;
		}
		if (data.creator === void 0) {
			const err4 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "creator" },
				message: "must have required property 'creator'"
			};
			if (vErrors === null) vErrors = [err4];
			else vErrors.push(err4);
			errors++;
		}
		if (data.content_profile === void 0) {
			const err5 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "content_profile" },
				message: "must have required property 'content_profile'"
			};
			if (vErrors === null) vErrors = [err5];
			else vErrors.push(err5);
			errors++;
		}
		if (data.policy === void 0) {
			const err6 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "policy" },
				message: "must have required property 'policy'"
			};
			if (vErrors === null) vErrors = [err6];
			else vErrors.push(err6);
			errors++;
		}
		if (data.ctx === void 0) {
			const err7 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "ctx" },
				message: "must have required property 'ctx'"
			};
			if (vErrors === null) vErrors = [err7];
			else vErrors.push(err7);
			errors++;
		}
		if (data.payloads === void 0) {
			const err8 = {
				instancePath,
				schemaPath: "#/required",
				keyword: "required",
				params: { missingProperty: "payloads" },
				message: "must have required property 'payloads'"
			};
			if (vErrors === null) vErrors = [err8];
			else vErrors.push(err8);
			errors++;
		}
		for (const key0 in data) if (!func2.call(schema42.properties, key0)) {
			const err9 = {
				instancePath,
				schemaPath: "#/additionalProperties",
				keyword: "additionalProperties",
				params: { additionalProperty: key0 },
				message: "must NOT have additional properties"
			};
			if (vErrors === null) vErrors = [err9];
			else vErrors.push(err9);
			errors++;
		}
		if (data.type !== void 0) {
			if ("capsule-manifest" !== data.type) {
				const err10 = {
					instancePath: instancePath + "/type",
					schemaPath: "#/properties/type/const",
					keyword: "const",
					params: { allowedValue: "capsule-manifest" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err10];
				else vErrors.push(err10);
				errors++;
			}
		}
		if (data.format_version !== void 0) {
			if ("1.0" !== data.format_version) {
				const err11 = {
					instancePath: instancePath + "/format_version",
					schemaPath: "#/properties/format_version/const",
					keyword: "const",
					params: { allowedValue: "1.0" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err11];
				else vErrors.push(err11);
				errors++;
			}
		}
		if (data.capsule !== void 0) {
			let data2 = data.capsule;
			if (data2 && typeof data2 == "object" && !Array.isArray(data2)) {
				if (data2.id === void 0) {
					const err12 = {
						instancePath: instancePath + "/capsule",
						schemaPath: "#/properties/capsule/required",
						keyword: "required",
						params: { missingProperty: "id" },
						message: "must have required property 'id'"
					};
					if (vErrors === null) vErrors = [err12];
					else vErrors.push(err12);
					errors++;
				}
				if (data2.revision === void 0) {
					const err13 = {
						instancePath: instancePath + "/capsule",
						schemaPath: "#/properties/capsule/required",
						keyword: "required",
						params: { missingProperty: "revision" },
						message: "must have required property 'revision'"
					};
					if (vErrors === null) vErrors = [err13];
					else vErrors.push(err13);
					errors++;
				}
				if (data2.created_at === void 0) {
					const err14 = {
						instancePath: instancePath + "/capsule",
						schemaPath: "#/properties/capsule/required",
						keyword: "required",
						params: { missingProperty: "created_at" },
						message: "must have required property 'created_at'"
					};
					if (vErrors === null) vErrors = [err14];
					else vErrors.push(err14);
					errors++;
				}
				for (const key1 in data2) if (!(key1 === "id" || key1 === "revision" || key1 === "created_at" || key1 === "predecessor")) {
					const err15 = {
						instancePath: instancePath + "/capsule",
						schemaPath: "#/properties/capsule/additionalProperties",
						keyword: "additionalProperties",
						params: { additionalProperty: key1 },
						message: "must NOT have additional properties"
					};
					if (vErrors === null) vErrors = [err15];
					else vErrors.push(err15);
					errors++;
				}
				if (data2.id !== void 0) {
					let data3 = data2.id;
					if (typeof data3 === "string") {
						if (!pattern6.test(data3)) {
							const err16 = {
								instancePath: instancePath + "/capsule/id",
								schemaPath: "#/$defs/capsuleId/pattern",
								keyword: "pattern",
								params: { pattern: "^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" },
								message: "must match pattern \"^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$\""
							};
							if (vErrors === null) vErrors = [err16];
							else vErrors.push(err16);
							errors++;
						}
					} else {
						const err17 = {
							instancePath: instancePath + "/capsule/id",
							schemaPath: "#/$defs/capsuleId/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err17];
						else vErrors.push(err17);
						errors++;
					}
				}
				if (data2.revision !== void 0) {
					let data4 = data2.revision;
					if (!(typeof data4 == "number" && !(data4 % 1) && !isNaN(data4) && isFinite(data4))) {
						const err18 = {
							instancePath: instancePath + "/capsule/revision",
							schemaPath: "#/properties/capsule/properties/revision/type",
							keyword: "type",
							params: { type: "integer" },
							message: "must be integer"
						};
						if (vErrors === null) vErrors = [err18];
						else vErrors.push(err18);
						errors++;
					}
					if (typeof data4 == "number" && isFinite(data4)) {
						if (data4 > 2147483647 || isNaN(data4)) {
							const err19 = {
								instancePath: instancePath + "/capsule/revision",
								schemaPath: "#/properties/capsule/properties/revision/maximum",
								keyword: "maximum",
								params: {
									comparison: "<=",
									limit: 2147483647
								},
								message: "must be <= 2147483647"
							};
							if (vErrors === null) vErrors = [err19];
							else vErrors.push(err19);
							errors++;
						}
						if (data4 < 1 || isNaN(data4)) {
							const err20 = {
								instancePath: instancePath + "/capsule/revision",
								schemaPath: "#/properties/capsule/properties/revision/minimum",
								keyword: "minimum",
								params: {
									comparison: ">=",
									limit: 1
								},
								message: "must be >= 1"
							};
							if (vErrors === null) vErrors = [err20];
							else vErrors.push(err20);
							errors++;
						}
					}
				}
				if (data2.created_at !== void 0) {
					let data5 = data2.created_at;
					if (typeof data5 === "string") {
						if (!formats0.validate(data5)) {
							const err21 = {
								instancePath: instancePath + "/capsule/created_at",
								schemaPath: "#/properties/capsule/properties/created_at/format",
								keyword: "format",
								params: { format: "date-time" },
								message: "must match format \"date-time\""
							};
							if (vErrors === null) vErrors = [err21];
							else vErrors.push(err21);
							errors++;
						}
					} else {
						const err22 = {
							instancePath: instancePath + "/capsule/created_at",
							schemaPath: "#/properties/capsule/properties/created_at/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err22];
						else vErrors.push(err22);
						errors++;
					}
				}
				if (data2.predecessor !== void 0) {
					let data6 = data2.predecessor;
					if (data6 && typeof data6 == "object" && !Array.isArray(data6)) {
						if (data6.id === void 0) {
							const err23 = {
								instancePath: instancePath + "/capsule/predecessor",
								schemaPath: "#/properties/capsule/properties/predecessor/required",
								keyword: "required",
								params: { missingProperty: "id" },
								message: "must have required property 'id'"
							};
							if (vErrors === null) vErrors = [err23];
							else vErrors.push(err23);
							errors++;
						}
						if (data6.revision === void 0) {
							const err24 = {
								instancePath: instancePath + "/capsule/predecessor",
								schemaPath: "#/properties/capsule/properties/predecessor/required",
								keyword: "required",
								params: { missingProperty: "revision" },
								message: "must have required property 'revision'"
							};
							if (vErrors === null) vErrors = [err24];
							else vErrors.push(err24);
							errors++;
						}
						if (data6.manifest_sha256 === void 0) {
							const err25 = {
								instancePath: instancePath + "/capsule/predecessor",
								schemaPath: "#/properties/capsule/properties/predecessor/required",
								keyword: "required",
								params: { missingProperty: "manifest_sha256" },
								message: "must have required property 'manifest_sha256'"
							};
							if (vErrors === null) vErrors = [err25];
							else vErrors.push(err25);
							errors++;
						}
						for (const key2 in data6) if (!(key2 === "id" || key2 === "revision" || key2 === "manifest_sha256")) {
							const err26 = {
								instancePath: instancePath + "/capsule/predecessor",
								schemaPath: "#/properties/capsule/properties/predecessor/additionalProperties",
								keyword: "additionalProperties",
								params: { additionalProperty: key2 },
								message: "must NOT have additional properties"
							};
							if (vErrors === null) vErrors = [err26];
							else vErrors.push(err26);
							errors++;
						}
						if (data6.id !== void 0) {
							let data7 = data6.id;
							if (typeof data7 === "string") {
								if (!pattern6.test(data7)) {
									const err27 = {
										instancePath: instancePath + "/capsule/predecessor/id",
										schemaPath: "#/$defs/capsuleId/pattern",
										keyword: "pattern",
										params: { pattern: "^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" },
										message: "must match pattern \"^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$\""
									};
									if (vErrors === null) vErrors = [err27];
									else vErrors.push(err27);
									errors++;
								}
							} else {
								const err28 = {
									instancePath: instancePath + "/capsule/predecessor/id",
									schemaPath: "#/$defs/capsuleId/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err28];
								else vErrors.push(err28);
								errors++;
							}
						}
						if (data6.revision !== void 0) {
							let data8 = data6.revision;
							if (!(typeof data8 == "number" && !(data8 % 1) && !isNaN(data8) && isFinite(data8))) {
								const err29 = {
									instancePath: instancePath + "/capsule/predecessor/revision",
									schemaPath: "#/properties/capsule/properties/predecessor/properties/revision/type",
									keyword: "type",
									params: { type: "integer" },
									message: "must be integer"
								};
								if (vErrors === null) vErrors = [err29];
								else vErrors.push(err29);
								errors++;
							}
							if (typeof data8 == "number" && isFinite(data8)) {
								if (data8 > 2147483647 || isNaN(data8)) {
									const err30 = {
										instancePath: instancePath + "/capsule/predecessor/revision",
										schemaPath: "#/properties/capsule/properties/predecessor/properties/revision/maximum",
										keyword: "maximum",
										params: {
											comparison: "<=",
											limit: 2147483647
										},
										message: "must be <= 2147483647"
									};
									if (vErrors === null) vErrors = [err30];
									else vErrors.push(err30);
									errors++;
								}
								if (data8 < 1 || isNaN(data8)) {
									const err31 = {
										instancePath: instancePath + "/capsule/predecessor/revision",
										schemaPath: "#/properties/capsule/properties/predecessor/properties/revision/minimum",
										keyword: "minimum",
										params: {
											comparison: ">=",
											limit: 1
										},
										message: "must be >= 1"
									};
									if (vErrors === null) vErrors = [err31];
									else vErrors.push(err31);
									errors++;
								}
							}
						}
						if (data6.manifest_sha256 !== void 0) {
							let data9 = data6.manifest_sha256;
							if (typeof data9 === "string") {
								if (!pattern8.test(data9)) {
									const err32 = {
										instancePath: instancePath + "/capsule/predecessor/manifest_sha256",
										schemaPath: "#/$defs/sha256/pattern",
										keyword: "pattern",
										params: { pattern: "^[A-Za-z0-9_-]{43}$" },
										message: "must match pattern \"^[A-Za-z0-9_-]{43}$\""
									};
									if (vErrors === null) vErrors = [err32];
									else vErrors.push(err32);
									errors++;
								}
							} else {
								const err33 = {
									instancePath: instancePath + "/capsule/predecessor/manifest_sha256",
									schemaPath: "#/$defs/sha256/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err33];
								else vErrors.push(err33);
								errors++;
							}
						}
					} else {
						const err34 = {
							instancePath: instancePath + "/capsule/predecessor",
							schemaPath: "#/properties/capsule/properties/predecessor/type",
							keyword: "type",
							params: { type: "object" },
							message: "must be object"
						};
						if (vErrors === null) vErrors = [err34];
						else vErrors.push(err34);
						errors++;
					}
				}
			} else {
				const err35 = {
					instancePath: instancePath + "/capsule",
					schemaPath: "#/properties/capsule/type",
					keyword: "type",
					params: { type: "object" },
					message: "must be object"
				};
				if (vErrors === null) vErrors = [err35];
				else vErrors.push(err35);
				errors++;
			}
		}
		if (data.cryptographic_suite !== void 0) {
			if ("ctx-capsule-v1" !== data.cryptographic_suite) {
				const err36 = {
					instancePath: instancePath + "/cryptographic_suite",
					schemaPath: "#/properties/cryptographic_suite/const",
					keyword: "const",
					params: { allowedValue: "ctx-capsule-v1" },
					message: "must be equal to constant"
				};
				if (vErrors === null) vErrors = [err36];
				else vErrors.push(err36);
				errors++;
			}
		}
		if (data.creator !== void 0) {
			let data11 = data.creator;
			if (data11 && typeof data11 == "object" && !Array.isArray(data11)) {
				if (data11.signing_key === void 0) {
					const err37 = {
						instancePath: instancePath + "/creator",
						schemaPath: "#/properties/creator/required",
						keyword: "required",
						params: { missingProperty: "signing_key" },
						message: "must have required property 'signing_key'"
					};
					if (vErrors === null) vErrors = [err37];
					else vErrors.push(err37);
					errors++;
				}
				for (const key3 in data11) if (!(key3 === "signing_key")) {
					const err38 = {
						instancePath: instancePath + "/creator",
						schemaPath: "#/properties/creator/additionalProperties",
						keyword: "additionalProperties",
						params: { additionalProperty: key3 },
						message: "must NOT have additional properties"
					};
					if (vErrors === null) vErrors = [err38];
					else vErrors.push(err38);
					errors++;
				}
				if (data11.signing_key !== void 0) {
					let data12 = data11.signing_key;
					if (data12 && typeof data12 == "object" && !Array.isArray(data12)) {
						if (data12.id === void 0) {
							const err39 = {
								instancePath: instancePath + "/creator/signing_key",
								schemaPath: "#/properties/creator/properties/signing_key/required",
								keyword: "required",
								params: { missingProperty: "id" },
								message: "must have required property 'id'"
							};
							if (vErrors === null) vErrors = [err39];
							else vErrors.push(err39);
							errors++;
						}
						if (data12.algorithm === void 0) {
							const err40 = {
								instancePath: instancePath + "/creator/signing_key",
								schemaPath: "#/properties/creator/properties/signing_key/required",
								keyword: "required",
								params: { missingProperty: "algorithm" },
								message: "must have required property 'algorithm'"
							};
							if (vErrors === null) vErrors = [err40];
							else vErrors.push(err40);
							errors++;
						}
						if (data12.public_key === void 0) {
							const err41 = {
								instancePath: instancePath + "/creator/signing_key",
								schemaPath: "#/properties/creator/properties/signing_key/required",
								keyword: "required",
								params: { missingProperty: "public_key" },
								message: "must have required property 'public_key'"
							};
							if (vErrors === null) vErrors = [err41];
							else vErrors.push(err41);
							errors++;
						}
						for (const key4 in data12) if (!(key4 === "id" || key4 === "algorithm" || key4 === "public_key")) {
							const err42 = {
								instancePath: instancePath + "/creator/signing_key",
								schemaPath: "#/properties/creator/properties/signing_key/additionalProperties",
								keyword: "additionalProperties",
								params: { additionalProperty: key4 },
								message: "must NOT have additional properties"
							};
							if (vErrors === null) vErrors = [err42];
							else vErrors.push(err42);
							errors++;
						}
						if (data12.id !== void 0) {
							let data13 = data12.id;
							if (typeof data13 === "string") {
								if (func1(data13) > 128) {
									const err43 = {
										instancePath: instancePath + "/creator/signing_key/id",
										schemaPath: "#/$defs/opaqueId/maxLength",
										keyword: "maxLength",
										params: { limit: 128 },
										message: "must NOT have more than 128 characters"
									};
									if (vErrors === null) vErrors = [err43];
									else vErrors.push(err43);
									errors++;
								}
								if (func1(data13) < 16) {
									const err44 = {
										instancePath: instancePath + "/creator/signing_key/id",
										schemaPath: "#/$defs/opaqueId/minLength",
										keyword: "minLength",
										params: { limit: 16 },
										message: "must NOT have fewer than 16 characters"
									};
									if (vErrors === null) vErrors = [err44];
									else vErrors.push(err44);
									errors++;
								}
								if (!pattern9.test(data13)) {
									const err45 = {
										instancePath: instancePath + "/creator/signing_key/id",
										schemaPath: "#/$defs/opaqueId/pattern",
										keyword: "pattern",
										params: { pattern: "^[A-Za-z0-9_-]+$" },
										message: "must match pattern \"^[A-Za-z0-9_-]+$\""
									};
									if (vErrors === null) vErrors = [err45];
									else vErrors.push(err45);
									errors++;
								}
							} else {
								const err46 = {
									instancePath: instancePath + "/creator/signing_key/id",
									schemaPath: "#/$defs/opaqueId/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err46];
								else vErrors.push(err46);
								errors++;
							}
						}
						if (data12.algorithm !== void 0) {
							if ("Ed25519" !== data12.algorithm) {
								const err47 = {
									instancePath: instancePath + "/creator/signing_key/algorithm",
									schemaPath: "#/properties/creator/properties/signing_key/properties/algorithm/const",
									keyword: "const",
									params: { allowedValue: "Ed25519" },
									message: "must be equal to constant"
								};
								if (vErrors === null) vErrors = [err47];
								else vErrors.push(err47);
								errors++;
							}
						}
						if (data12.public_key !== void 0) {
							let data15 = data12.public_key;
							if (typeof data15 === "string") {
								if (!pattern8.test(data15)) {
									const err48 = {
										instancePath: instancePath + "/creator/signing_key/public_key",
										schemaPath: "#/properties/creator/properties/signing_key/properties/public_key/pattern",
										keyword: "pattern",
										params: { pattern: "^[A-Za-z0-9_-]{43}$" },
										message: "must match pattern \"^[A-Za-z0-9_-]{43}$\""
									};
									if (vErrors === null) vErrors = [err48];
									else vErrors.push(err48);
									errors++;
								}
							} else {
								const err49 = {
									instancePath: instancePath + "/creator/signing_key/public_key",
									schemaPath: "#/properties/creator/properties/signing_key/properties/public_key/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err49];
								else vErrors.push(err49);
								errors++;
							}
						}
					} else {
						const err50 = {
							instancePath: instancePath + "/creator/signing_key",
							schemaPath: "#/properties/creator/properties/signing_key/type",
							keyword: "type",
							params: { type: "object" },
							message: "must be object"
						};
						if (vErrors === null) vErrors = [err50];
						else vErrors.push(err50);
						errors++;
					}
				}
			} else {
				const err51 = {
					instancePath: instancePath + "/creator",
					schemaPath: "#/properties/creator/type",
					keyword: "type",
					params: { type: "object" },
					message: "must be object"
				};
				if (vErrors === null) vErrors = [err51];
				else vErrors.push(err51);
				errors++;
			}
		}
		if (data.content_profile !== void 0) {
			let data16 = data.content_profile;
			if (data16 && typeof data16 == "object" && !Array.isArray(data16)) {
				if (data16.id === void 0) {
					const err52 = {
						instancePath: instancePath + "/content_profile",
						schemaPath: "#/properties/content_profile/required",
						keyword: "required",
						params: { missingProperty: "id" },
						message: "must have required property 'id'"
					};
					if (vErrors === null) vErrors = [err52];
					else vErrors.push(err52);
					errors++;
				}
				if (data16.version === void 0) {
					const err53 = {
						instancePath: instancePath + "/content_profile",
						schemaPath: "#/properties/content_profile/required",
						keyword: "required",
						params: { missingProperty: "version" },
						message: "must have required property 'version'"
					};
					if (vErrors === null) vErrors = [err53];
					else vErrors.push(err53);
					errors++;
				}
				for (const key5 in data16) if (!(key5 === "id" || key5 === "version")) {
					const err54 = {
						instancePath: instancePath + "/content_profile",
						schemaPath: "#/properties/content_profile/additionalProperties",
						keyword: "additionalProperties",
						params: { additionalProperty: key5 },
						message: "must NOT have additional properties"
					};
					if (vErrors === null) vErrors = [err54];
					else vErrors.push(err54);
					errors++;
				}
				if (data16.id !== void 0) {
					if ("ctx.content.static-image" !== data16.id) {
						const err55 = {
							instancePath: instancePath + "/content_profile/id",
							schemaPath: "#/properties/content_profile/properties/id/const",
							keyword: "const",
							params: { allowedValue: "ctx.content.static-image" },
							message: "must be equal to constant"
						};
						if (vErrors === null) vErrors = [err55];
						else vErrors.push(err55);
						errors++;
					}
				}
				if (data16.version !== void 0) {
					if ("1.0" !== data16.version) {
						const err56 = {
							instancePath: instancePath + "/content_profile/version",
							schemaPath: "#/properties/content_profile/properties/version/const",
							keyword: "const",
							params: { allowedValue: "1.0" },
							message: "must be equal to constant"
						};
						if (vErrors === null) vErrors = [err56];
						else vErrors.push(err56);
						errors++;
					}
				}
			} else {
				const err57 = {
					instancePath: instancePath + "/content_profile",
					schemaPath: "#/properties/content_profile/type",
					keyword: "type",
					params: { type: "object" },
					message: "must be object"
				};
				if (vErrors === null) vErrors = [err57];
				else vErrors.push(err57);
				errors++;
			}
		}
		if (data.description !== void 0) {
			let data19 = data.description;
			if (data19 && typeof data19 == "object" && !Array.isArray(data19)) {
				if (Object.keys(data19).length < 1) {
					const err58 = {
						instancePath: instancePath + "/description",
						schemaPath: "#/properties/description/minProperties",
						keyword: "minProperties",
						params: { limit: 1 },
						message: "must NOT have fewer than 1 properties"
					};
					if (vErrors === null) vErrors = [err58];
					else vErrors.push(err58);
					errors++;
				}
				for (const key6 in data19) if (!(key6 === "title" || key6 === "description" || key6 === "creator_display_name" || key6 === "original_filename")) {
					const err59 = {
						instancePath: instancePath + "/description",
						schemaPath: "#/properties/description/additionalProperties",
						keyword: "additionalProperties",
						params: { additionalProperty: key6 },
						message: "must NOT have additional properties"
					};
					if (vErrors === null) vErrors = [err59];
					else vErrors.push(err59);
					errors++;
				}
				if (data19.title !== void 0) {
					let data20 = data19.title;
					if (typeof data20 === "string") {
						if (func1(data20) > 200) {
							const err60 = {
								instancePath: instancePath + "/description/title",
								schemaPath: "#/properties/description/properties/title/maxLength",
								keyword: "maxLength",
								params: { limit: 200 },
								message: "must NOT have more than 200 characters"
							};
							if (vErrors === null) vErrors = [err60];
							else vErrors.push(err60);
							errors++;
						}
						if (func1(data20) < 1) {
							const err61 = {
								instancePath: instancePath + "/description/title",
								schemaPath: "#/properties/description/properties/title/minLength",
								keyword: "minLength",
								params: { limit: 1 },
								message: "must NOT have fewer than 1 characters"
							};
							if (vErrors === null) vErrors = [err61];
							else vErrors.push(err61);
							errors++;
						}
					} else {
						const err62 = {
							instancePath: instancePath + "/description/title",
							schemaPath: "#/properties/description/properties/title/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err62];
						else vErrors.push(err62);
						errors++;
					}
				}
				if (data19.description !== void 0) {
					let data21 = data19.description;
					if (typeof data21 === "string") {
						if (func1(data21) > 2e3) {
							const err63 = {
								instancePath: instancePath + "/description/description",
								schemaPath: "#/properties/description/properties/description/maxLength",
								keyword: "maxLength",
								params: { limit: 2e3 },
								message: "must NOT have more than 2000 characters"
							};
							if (vErrors === null) vErrors = [err63];
							else vErrors.push(err63);
							errors++;
						}
						if (func1(data21) < 1) {
							const err64 = {
								instancePath: instancePath + "/description/description",
								schemaPath: "#/properties/description/properties/description/minLength",
								keyword: "minLength",
								params: { limit: 1 },
								message: "must NOT have fewer than 1 characters"
							};
							if (vErrors === null) vErrors = [err64];
							else vErrors.push(err64);
							errors++;
						}
					} else {
						const err65 = {
							instancePath: instancePath + "/description/description",
							schemaPath: "#/properties/description/properties/description/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err65];
						else vErrors.push(err65);
						errors++;
					}
				}
				if (data19.creator_display_name !== void 0) {
					let data22 = data19.creator_display_name;
					if (typeof data22 === "string") {
						if (func1(data22) > 200) {
							const err66 = {
								instancePath: instancePath + "/description/creator_display_name",
								schemaPath: "#/properties/description/properties/creator_display_name/maxLength",
								keyword: "maxLength",
								params: { limit: 200 },
								message: "must NOT have more than 200 characters"
							};
							if (vErrors === null) vErrors = [err66];
							else vErrors.push(err66);
							errors++;
						}
						if (func1(data22) < 1) {
							const err67 = {
								instancePath: instancePath + "/description/creator_display_name",
								schemaPath: "#/properties/description/properties/creator_display_name/minLength",
								keyword: "minLength",
								params: { limit: 1 },
								message: "must NOT have fewer than 1 characters"
							};
							if (vErrors === null) vErrors = [err67];
							else vErrors.push(err67);
							errors++;
						}
					} else {
						const err68 = {
							instancePath: instancePath + "/description/creator_display_name",
							schemaPath: "#/properties/description/properties/creator_display_name/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err68];
						else vErrors.push(err68);
						errors++;
					}
				}
				if (data19.original_filename !== void 0) {
					let data23 = data19.original_filename;
					if (typeof data23 === "string") {
						if (func1(data23) > 255) {
							const err69 = {
								instancePath: instancePath + "/description/original_filename",
								schemaPath: "#/properties/description/properties/original_filename/maxLength",
								keyword: "maxLength",
								params: { limit: 255 },
								message: "must NOT have more than 255 characters"
							};
							if (vErrors === null) vErrors = [err69];
							else vErrors.push(err69);
							errors++;
						}
						if (func1(data23) < 1) {
							const err70 = {
								instancePath: instancePath + "/description/original_filename",
								schemaPath: "#/properties/description/properties/original_filename/minLength",
								keyword: "minLength",
								params: { limit: 1 },
								message: "must NOT have fewer than 1 characters"
							};
							if (vErrors === null) vErrors = [err70];
							else vErrors.push(err70);
							errors++;
						}
					} else {
						const err71 = {
							instancePath: instancePath + "/description/original_filename",
							schemaPath: "#/properties/description/properties/original_filename/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err71];
						else vErrors.push(err71);
						errors++;
					}
				}
			} else {
				const err72 = {
					instancePath: instancePath + "/description",
					schemaPath: "#/properties/description/type",
					keyword: "type",
					params: { type: "object" },
					message: "must be object"
				};
				if (vErrors === null) vErrors = [err72];
				else vErrors.push(err72);
				errors++;
			}
		}
		if (data.policy !== void 0) {
			if (!validate20(data.policy, {
				instancePath: instancePath + "/policy",
				parentData: data,
				parentDataProperty: "policy",
				rootData,
				dynamicAnchors
			})) {
				vErrors = vErrors === null ? validate20.errors : vErrors.concat(validate20.errors);
				errors = vErrors.length;
			}
		}
		if (data.ctx !== void 0) {
			let data25 = data.ctx;
			if (data25 && typeof data25 == "object" && !Array.isArray(data25)) {
				if (data25.issuer === void 0) {
					const err73 = {
						instancePath: instancePath + "/ctx",
						schemaPath: "#/properties/ctx/required",
						keyword: "required",
						params: { missingProperty: "issuer" },
						message: "must have required property 'issuer'"
					};
					if (vErrors === null) vErrors = [err73];
					else vErrors.push(err73);
					errors++;
				}
				for (const key7 in data25) if (!(key7 === "issuer")) {
					const err74 = {
						instancePath: instancePath + "/ctx",
						schemaPath: "#/properties/ctx/additionalProperties",
						keyword: "additionalProperties",
						params: { additionalProperty: key7 },
						message: "must NOT have additional properties"
					};
					if (vErrors === null) vErrors = [err74];
					else vErrors.push(err74);
					errors++;
				}
				if (data25.issuer !== void 0) {
					let data26 = data25.issuer;
					if (typeof data26 === "string") {
						if (func1(data26) > 2048) {
							const err75 = {
								instancePath: instancePath + "/ctx/issuer",
								schemaPath: "#/properties/ctx/properties/issuer/maxLength",
								keyword: "maxLength",
								params: { limit: 2048 },
								message: "must NOT have more than 2048 characters"
							};
							if (vErrors === null) vErrors = [err75];
							else vErrors.push(err75);
							errors++;
						}
						if (!pattern11.test(data26)) {
							const err76 = {
								instancePath: instancePath + "/ctx/issuer",
								schemaPath: "#/properties/ctx/properties/issuer/pattern",
								keyword: "pattern",
								params: { pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))" },
								message: "must match pattern \"^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))\""
							};
							if (vErrors === null) vErrors = [err76];
							else vErrors.push(err76);
							errors++;
						}
						if (!formats4(data26)) {
							const err77 = {
								instancePath: instancePath + "/ctx/issuer",
								schemaPath: "#/properties/ctx/properties/issuer/format",
								keyword: "format",
								params: { format: "uri" },
								message: "must match format \"uri\""
							};
							if (vErrors === null) vErrors = [err77];
							else vErrors.push(err77);
							errors++;
						}
					} else {
						const err78 = {
							instancePath: instancePath + "/ctx/issuer",
							schemaPath: "#/properties/ctx/properties/issuer/type",
							keyword: "type",
							params: { type: "string" },
							message: "must be string"
						};
						if (vErrors === null) vErrors = [err78];
						else vErrors.push(err78);
						errors++;
					}
				}
			} else {
				const err79 = {
					instancePath: instancePath + "/ctx",
					schemaPath: "#/properties/ctx/type",
					keyword: "type",
					params: { type: "object" },
					message: "must be object"
				};
				if (vErrors === null) vErrors = [err79];
				else vErrors.push(err79);
				errors++;
			}
		}
		if (data.payloads !== void 0) {
			let data27 = data.payloads;
			if (Array.isArray(data27)) {
				if (data27.length > 1) {
					const err80 = {
						instancePath: instancePath + "/payloads",
						schemaPath: "#/properties/payloads/maxItems",
						keyword: "maxItems",
						params: { limit: 1 },
						message: "must NOT have more than 1 items"
					};
					if (vErrors === null) vErrors = [err80];
					else vErrors.push(err80);
					errors++;
				}
				if (data27.length < 1) {
					const err81 = {
						instancePath: instancePath + "/payloads",
						schemaPath: "#/properties/payloads/minItems",
						keyword: "minItems",
						params: { limit: 1 },
						message: "must NOT have fewer than 1 items"
					};
					if (vErrors === null) vErrors = [err81];
					else vErrors.push(err81);
					errors++;
				}
				const len0 = data27.length;
				for (let i0 = 0; i0 < len0; i0++) {
					let data28 = data27[i0];
					if (data28 && typeof data28 == "object" && !Array.isArray(data28)) {
						if (data28.id === void 0) {
							const err82 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "id" },
								message: "must have required property 'id'"
							};
							if (vErrors === null) vErrors = [err82];
							else vErrors.push(err82);
							errors++;
						}
						if (data28.path === void 0) {
							const err83 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "path" },
								message: "must have required property 'path'"
							};
							if (vErrors === null) vErrors = [err83];
							else vErrors.push(err83);
							errors++;
						}
						if (data28.media_type === void 0) {
							const err84 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "media_type" },
								message: "must have required property 'media_type'"
							};
							if (vErrors === null) vErrors = [err84];
							else vErrors.push(err84);
							errors++;
						}
						if (data28.plaintext_size === void 0) {
							const err85 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "plaintext_size" },
								message: "must have required property 'plaintext_size'"
							};
							if (vErrors === null) vErrors = [err85];
							else vErrors.push(err85);
							errors++;
						}
						if (data28.ciphertext_size === void 0) {
							const err86 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "ciphertext_size" },
								message: "must have required property 'ciphertext_size'"
							};
							if (vErrors === null) vErrors = [err86];
							else vErrors.push(err86);
							errors++;
						}
						if (data28.ciphertext_sha256 === void 0) {
							const err87 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "ciphertext_sha256" },
								message: "must have required property 'ciphertext_sha256'"
							};
							if (vErrors === null) vErrors = [err87];
							else vErrors.push(err87);
							errors++;
						}
						if (data28.encryption === void 0) {
							const err88 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "encryption" },
								message: "must have required property 'encryption'"
							};
							if (vErrors === null) vErrors = [err88];
							else vErrors.push(err88);
							errors++;
						}
						if (data28.key_release === void 0) {
							const err89 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "key_release" },
								message: "must have required property 'key_release'"
							};
							if (vErrors === null) vErrors = [err89];
							else vErrors.push(err89);
							errors++;
						}
						if (data28.profile_metadata === void 0) {
							const err90 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/required",
								keyword: "required",
								params: { missingProperty: "profile_metadata" },
								message: "must have required property 'profile_metadata'"
							};
							if (vErrors === null) vErrors = [err90];
							else vErrors.push(err90);
							errors++;
						}
						for (const key8 in data28) if (!func2.call(schema42.properties.payloads.items.properties, key8)) {
							const err91 = {
								instancePath: instancePath + "/payloads/" + i0,
								schemaPath: "#/properties/payloads/items/additionalProperties",
								keyword: "additionalProperties",
								params: { additionalProperty: key8 },
								message: "must NOT have additional properties"
							};
							if (vErrors === null) vErrors = [err91];
							else vErrors.push(err91);
							errors++;
						}
						if (data28.id !== void 0) {
							let data29 = data28.id;
							if (typeof data29 === "string") {
								if (func1(data29) > 64) {
									const err92 = {
										instancePath: instancePath + "/payloads/" + i0 + "/id",
										schemaPath: "#/$defs/payloadId/maxLength",
										keyword: "maxLength",
										params: { limit: 64 },
										message: "must NOT have more than 64 characters"
									};
									if (vErrors === null) vErrors = [err92];
									else vErrors.push(err92);
									errors++;
								}
								if (func1(data29) < 1) {
									const err93 = {
										instancePath: instancePath + "/payloads/" + i0 + "/id",
										schemaPath: "#/$defs/payloadId/minLength",
										keyword: "minLength",
										params: { limit: 1 },
										message: "must NOT have fewer than 1 characters"
									};
									if (vErrors === null) vErrors = [err93];
									else vErrors.push(err93);
									errors++;
								}
								if (!pattern12.test(data29)) {
									const err94 = {
										instancePath: instancePath + "/payloads/" + i0 + "/id",
										schemaPath: "#/$defs/payloadId/pattern",
										keyword: "pattern",
										params: { pattern: "^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$" },
										message: "must match pattern \"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$\""
									};
									if (vErrors === null) vErrors = [err94];
									else vErrors.push(err94);
									errors++;
								}
							} else {
								const err95 = {
									instancePath: instancePath + "/payloads/" + i0 + "/id",
									schemaPath: "#/$defs/payloadId/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err95];
								else vErrors.push(err95);
								errors++;
							}
						}
						if (data28.path !== void 0) {
							let data30 = data28.path;
							if (typeof data30 === "string") {
								if (func1(data30) > 77) {
									const err96 = {
										instancePath: instancePath + "/payloads/" + i0 + "/path",
										schemaPath: "#/properties/payloads/items/properties/path/maxLength",
										keyword: "maxLength",
										params: { limit: 77 },
										message: "must NOT have more than 77 characters"
									};
									if (vErrors === null) vErrors = [err96];
									else vErrors.push(err96);
									errors++;
								}
								if (!pattern13.test(data30)) {
									const err97 = {
										instancePath: instancePath + "/payloads/" + i0 + "/path",
										schemaPath: "#/properties/payloads/items/properties/path/pattern",
										keyword: "pattern",
										params: { pattern: "^payloads/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.enc$" },
										message: "must match pattern \"^payloads/[a-z][a-z0-9]*(?:-[a-z0-9]+)*\\.enc$\""
									};
									if (vErrors === null) vErrors = [err97];
									else vErrors.push(err97);
									errors++;
								}
							} else {
								const err98 = {
									instancePath: instancePath + "/payloads/" + i0 + "/path",
									schemaPath: "#/properties/payloads/items/properties/path/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err98];
								else vErrors.push(err98);
								errors++;
							}
						}
						if (data28.media_type !== void 0) {
							let data31 = data28.media_type;
							if (!(data31 === "image/jpeg" || data31 === "image/png" || data31 === "image/webp")) {
								const err99 = {
									instancePath: instancePath + "/payloads/" + i0 + "/media_type",
									schemaPath: "#/properties/payloads/items/properties/media_type/enum",
									keyword: "enum",
									params: { allowedValues: schema42.properties.payloads.items.properties.media_type.enum },
									message: "must be equal to one of the allowed values"
								};
								if (vErrors === null) vErrors = [err99];
								else vErrors.push(err99);
								errors++;
							}
						}
						if (data28.plaintext_size !== void 0) {
							let data32 = data28.plaintext_size;
							if (!(typeof data32 == "number" && !(data32 % 1) && !isNaN(data32) && isFinite(data32))) {
								const err100 = {
									instancePath: instancePath + "/payloads/" + i0 + "/plaintext_size",
									schemaPath: "#/properties/payloads/items/properties/plaintext_size/type",
									keyword: "type",
									params: { type: "integer" },
									message: "must be integer"
								};
								if (vErrors === null) vErrors = [err100];
								else vErrors.push(err100);
								errors++;
							}
							if (typeof data32 == "number" && isFinite(data32)) {
								if (data32 > 26214400 || isNaN(data32)) {
									const err101 = {
										instancePath: instancePath + "/payloads/" + i0 + "/plaintext_size",
										schemaPath: "#/properties/payloads/items/properties/plaintext_size/maximum",
										keyword: "maximum",
										params: {
											comparison: "<=",
											limit: 26214400
										},
										message: "must be <= 26214400"
									};
									if (vErrors === null) vErrors = [err101];
									else vErrors.push(err101);
									errors++;
								}
								if (data32 < 1 || isNaN(data32)) {
									const err102 = {
										instancePath: instancePath + "/payloads/" + i0 + "/plaintext_size",
										schemaPath: "#/properties/payloads/items/properties/plaintext_size/minimum",
										keyword: "minimum",
										params: {
											comparison: ">=",
											limit: 1
										},
										message: "must be >= 1"
									};
									if (vErrors === null) vErrors = [err102];
									else vErrors.push(err102);
									errors++;
								}
							}
						}
						if (data28.ciphertext_size !== void 0) {
							let data33 = data28.ciphertext_size;
							if (!(typeof data33 == "number" && !(data33 % 1) && !isNaN(data33) && isFinite(data33))) {
								const err103 = {
									instancePath: instancePath + "/payloads/" + i0 + "/ciphertext_size",
									schemaPath: "#/properties/payloads/items/properties/ciphertext_size/type",
									keyword: "type",
									params: { type: "integer" },
									message: "must be integer"
								};
								if (vErrors === null) vErrors = [err103];
								else vErrors.push(err103);
								errors++;
							}
							if (typeof data33 == "number" && isFinite(data33)) {
								if (data33 > 26214416 || isNaN(data33)) {
									const err104 = {
										instancePath: instancePath + "/payloads/" + i0 + "/ciphertext_size",
										schemaPath: "#/properties/payloads/items/properties/ciphertext_size/maximum",
										keyword: "maximum",
										params: {
											comparison: "<=",
											limit: 26214416
										},
										message: "must be <= 26214416"
									};
									if (vErrors === null) vErrors = [err104];
									else vErrors.push(err104);
									errors++;
								}
								if (data33 < 17 || isNaN(data33)) {
									const err105 = {
										instancePath: instancePath + "/payloads/" + i0 + "/ciphertext_size",
										schemaPath: "#/properties/payloads/items/properties/ciphertext_size/minimum",
										keyword: "minimum",
										params: {
											comparison: ">=",
											limit: 17
										},
										message: "must be >= 17"
									};
									if (vErrors === null) vErrors = [err105];
									else vErrors.push(err105);
									errors++;
								}
							}
						}
						if (data28.ciphertext_sha256 !== void 0) {
							let data34 = data28.ciphertext_sha256;
							if (typeof data34 === "string") {
								if (!pattern8.test(data34)) {
									const err106 = {
										instancePath: instancePath + "/payloads/" + i0 + "/ciphertext_sha256",
										schemaPath: "#/$defs/sha256/pattern",
										keyword: "pattern",
										params: { pattern: "^[A-Za-z0-9_-]{43}$" },
										message: "must match pattern \"^[A-Za-z0-9_-]{43}$\""
									};
									if (vErrors === null) vErrors = [err106];
									else vErrors.push(err106);
									errors++;
								}
							} else {
								const err107 = {
									instancePath: instancePath + "/payloads/" + i0 + "/ciphertext_sha256",
									schemaPath: "#/$defs/sha256/type",
									keyword: "type",
									params: { type: "string" },
									message: "must be string"
								};
								if (vErrors === null) vErrors = [err107];
								else vErrors.push(err107);
								errors++;
							}
						}
						if (data28.encryption !== void 0) {
							let data35 = data28.encryption;
							if (data35 && typeof data35 == "object" && !Array.isArray(data35)) {
								if (data35.representation === void 0) {
									const err108 = {
										instancePath: instancePath + "/payloads/" + i0 + "/encryption",
										schemaPath: "#/properties/payloads/items/properties/encryption/required",
										keyword: "required",
										params: { missingProperty: "representation" },
										message: "must have required property 'representation'"
									};
									if (vErrors === null) vErrors = [err108];
									else vErrors.push(err108);
									errors++;
								}
								if (data35.nonce === void 0) {
									const err109 = {
										instancePath: instancePath + "/payloads/" + i0 + "/encryption",
										schemaPath: "#/properties/payloads/items/properties/encryption/required",
										keyword: "required",
										params: { missingProperty: "nonce" },
										message: "must have required property 'nonce'"
									};
									if (vErrors === null) vErrors = [err109];
									else vErrors.push(err109);
									errors++;
								}
								for (const key9 in data35) if (!(key9 === "representation" || key9 === "nonce")) {
									const err110 = {
										instancePath: instancePath + "/payloads/" + i0 + "/encryption",
										schemaPath: "#/properties/payloads/items/properties/encryption/additionalProperties",
										keyword: "additionalProperties",
										params: { additionalProperty: key9 },
										message: "must NOT have additional properties"
									};
									if (vErrors === null) vErrors = [err110];
									else vErrors.push(err110);
									errors++;
								}
								if (data35.representation !== void 0) {
									if ("whole" !== data35.representation) {
										const err111 = {
											instancePath: instancePath + "/payloads/" + i0 + "/encryption/representation",
											schemaPath: "#/properties/payloads/items/properties/encryption/properties/representation/const",
											keyword: "const",
											params: { allowedValue: "whole" },
											message: "must be equal to constant"
										};
										if (vErrors === null) vErrors = [err111];
										else vErrors.push(err111);
										errors++;
									}
								}
								if (data35.nonce !== void 0) {
									let data37 = data35.nonce;
									if (typeof data37 === "string") {
										if (!pattern15.test(data37)) {
											const err112 = {
												instancePath: instancePath + "/payloads/" + i0 + "/encryption/nonce",
												schemaPath: "#/properties/payloads/items/properties/encryption/properties/nonce/pattern",
												keyword: "pattern",
												params: { pattern: "^[A-Za-z0-9_-]{16}$" },
												message: "must match pattern \"^[A-Za-z0-9_-]{16}$\""
											};
											if (vErrors === null) vErrors = [err112];
											else vErrors.push(err112);
											errors++;
										}
									} else {
										const err113 = {
											instancePath: instancePath + "/payloads/" + i0 + "/encryption/nonce",
											schemaPath: "#/properties/payloads/items/properties/encryption/properties/nonce/type",
											keyword: "type",
											params: { type: "string" },
											message: "must be string"
										};
										if (vErrors === null) vErrors = [err113];
										else vErrors.push(err113);
										errors++;
									}
								}
							} else {
								const err114 = {
									instancePath: instancePath + "/payloads/" + i0 + "/encryption",
									schemaPath: "#/properties/payloads/items/properties/encryption/type",
									keyword: "type",
									params: { type: "object" },
									message: "must be object"
								};
								if (vErrors === null) vErrors = [err114];
								else vErrors.push(err114);
								errors++;
							}
						}
						if (data28.key_release !== void 0) {
							let data38 = data28.key_release;
							if (data38 && typeof data38 == "object" && !Array.isArray(data38)) {
								if (data38.broker === void 0) {
									const err115 = {
										instancePath: instancePath + "/payloads/" + i0 + "/key_release",
										schemaPath: "#/properties/payloads/items/properties/key_release/required",
										keyword: "required",
										params: { missingProperty: "broker" },
										message: "must have required property 'broker'"
									};
									if (vErrors === null) vErrors = [err115];
									else vErrors.push(err115);
									errors++;
								}
								if (data38.handle === void 0) {
									const err116 = {
										instancePath: instancePath + "/payloads/" + i0 + "/key_release",
										schemaPath: "#/properties/payloads/items/properties/key_release/required",
										keyword: "required",
										params: { missingProperty: "handle" },
										message: "must have required property 'handle'"
									};
									if (vErrors === null) vErrors = [err116];
									else vErrors.push(err116);
									errors++;
								}
								for (const key10 in data38) if (!(key10 === "broker" || key10 === "handle")) {
									const err117 = {
										instancePath: instancePath + "/payloads/" + i0 + "/key_release",
										schemaPath: "#/properties/payloads/items/properties/key_release/additionalProperties",
										keyword: "additionalProperties",
										params: { additionalProperty: key10 },
										message: "must NOT have additional properties"
									};
									if (vErrors === null) vErrors = [err117];
									else vErrors.push(err117);
									errors++;
								}
								if (data38.broker !== void 0) {
									let data39 = data38.broker;
									if (typeof data39 === "string") {
										if (func1(data39) > 2048) {
											const err118 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/broker",
												schemaPath: "#/properties/payloads/items/properties/key_release/properties/broker/maxLength",
												keyword: "maxLength",
												params: { limit: 2048 },
												message: "must NOT have more than 2048 characters"
											};
											if (vErrors === null) vErrors = [err118];
											else vErrors.push(err118);
											errors++;
										}
										if (!pattern11.test(data39)) {
											const err119 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/broker",
												schemaPath: "#/properties/payloads/items/properties/key_release/properties/broker/pattern",
												keyword: "pattern",
												params: { pattern: "^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))" },
												message: "must match pattern \"^(?:https://|http://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::[0-9]+)?(?:/|$))\""
											};
											if (vErrors === null) vErrors = [err119];
											else vErrors.push(err119);
											errors++;
										}
										if (!formats4(data39)) {
											const err120 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/broker",
												schemaPath: "#/properties/payloads/items/properties/key_release/properties/broker/format",
												keyword: "format",
												params: { format: "uri" },
												message: "must match format \"uri\""
											};
											if (vErrors === null) vErrors = [err120];
											else vErrors.push(err120);
											errors++;
										}
									} else {
										const err121 = {
											instancePath: instancePath + "/payloads/" + i0 + "/key_release/broker",
											schemaPath: "#/properties/payloads/items/properties/key_release/properties/broker/type",
											keyword: "type",
											params: { type: "string" },
											message: "must be string"
										};
										if (vErrors === null) vErrors = [err121];
										else vErrors.push(err121);
										errors++;
									}
								}
								if (data38.handle !== void 0) {
									let data40 = data38.handle;
									if (typeof data40 === "string") {
										if (func1(data40) > 128) {
											const err122 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/handle",
												schemaPath: "#/$defs/opaqueId/maxLength",
												keyword: "maxLength",
												params: { limit: 128 },
												message: "must NOT have more than 128 characters"
											};
											if (vErrors === null) vErrors = [err122];
											else vErrors.push(err122);
											errors++;
										}
										if (func1(data40) < 16) {
											const err123 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/handle",
												schemaPath: "#/$defs/opaqueId/minLength",
												keyword: "minLength",
												params: { limit: 16 },
												message: "must NOT have fewer than 16 characters"
											};
											if (vErrors === null) vErrors = [err123];
											else vErrors.push(err123);
											errors++;
										}
										if (!pattern9.test(data40)) {
											const err124 = {
												instancePath: instancePath + "/payloads/" + i0 + "/key_release/handle",
												schemaPath: "#/$defs/opaqueId/pattern",
												keyword: "pattern",
												params: { pattern: "^[A-Za-z0-9_-]+$" },
												message: "must match pattern \"^[A-Za-z0-9_-]+$\""
											};
											if (vErrors === null) vErrors = [err124];
											else vErrors.push(err124);
											errors++;
										}
									} else {
										const err125 = {
											instancePath: instancePath + "/payloads/" + i0 + "/key_release/handle",
											schemaPath: "#/$defs/opaqueId/type",
											keyword: "type",
											params: { type: "string" },
											message: "must be string"
										};
										if (vErrors === null) vErrors = [err125];
										else vErrors.push(err125);
										errors++;
									}
								}
							} else {
								const err126 = {
									instancePath: instancePath + "/payloads/" + i0 + "/key_release",
									schemaPath: "#/properties/payloads/items/properties/key_release/type",
									keyword: "type",
									params: { type: "object" },
									message: "must be object"
								};
								if (vErrors === null) vErrors = [err126];
								else vErrors.push(err126);
								errors++;
							}
						}
						if (data28.profile_metadata !== void 0) {
							let data41 = data28.profile_metadata;
							if (data41 && typeof data41 == "object" && !Array.isArray(data41)) {
								if (data41.width === void 0) {
									const err127 = {
										instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata",
										schemaPath: "#/properties/payloads/items/properties/profile_metadata/required",
										keyword: "required",
										params: { missingProperty: "width" },
										message: "must have required property 'width'"
									};
									if (vErrors === null) vErrors = [err127];
									else vErrors.push(err127);
									errors++;
								}
								if (data41.height === void 0) {
									const err128 = {
										instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata",
										schemaPath: "#/properties/payloads/items/properties/profile_metadata/required",
										keyword: "required",
										params: { missingProperty: "height" },
										message: "must have required property 'height'"
									};
									if (vErrors === null) vErrors = [err128];
									else vErrors.push(err128);
									errors++;
								}
								if (data41.pixel_count === void 0) {
									const err129 = {
										instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata",
										schemaPath: "#/properties/payloads/items/properties/profile_metadata/required",
										keyword: "required",
										params: { missingProperty: "pixel_count" },
										message: "must have required property 'pixel_count'"
									};
									if (vErrors === null) vErrors = [err129];
									else vErrors.push(err129);
									errors++;
								}
								for (const key11 in data41) if (!(key11 === "width" || key11 === "height" || key11 === "pixel_count")) {
									const err130 = {
										instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata",
										schemaPath: "#/properties/payloads/items/properties/profile_metadata/additionalProperties",
										keyword: "additionalProperties",
										params: { additionalProperty: key11 },
										message: "must NOT have additional properties"
									};
									if (vErrors === null) vErrors = [err130];
									else vErrors.push(err130);
									errors++;
								}
								if (data41.width !== void 0) {
									let data42 = data41.width;
									if (!(typeof data42 == "number" && !(data42 % 1) && !isNaN(data42) && isFinite(data42))) {
										const err131 = {
											instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/width",
											schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/width/type",
											keyword: "type",
											params: { type: "integer" },
											message: "must be integer"
										};
										if (vErrors === null) vErrors = [err131];
										else vErrors.push(err131);
										errors++;
									}
									if (typeof data42 == "number" && isFinite(data42)) {
										if (data42 > 16384 || isNaN(data42)) {
											const err132 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/width",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/width/maximum",
												keyword: "maximum",
												params: {
													comparison: "<=",
													limit: 16384
												},
												message: "must be <= 16384"
											};
											if (vErrors === null) vErrors = [err132];
											else vErrors.push(err132);
											errors++;
										}
										if (data42 < 1 || isNaN(data42)) {
											const err133 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/width",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/width/minimum",
												keyword: "minimum",
												params: {
													comparison: ">=",
													limit: 1
												},
												message: "must be >= 1"
											};
											if (vErrors === null) vErrors = [err133];
											else vErrors.push(err133);
											errors++;
										}
									}
								}
								if (data41.height !== void 0) {
									let data43 = data41.height;
									if (!(typeof data43 == "number" && !(data43 % 1) && !isNaN(data43) && isFinite(data43))) {
										const err134 = {
											instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/height",
											schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/height/type",
											keyword: "type",
											params: { type: "integer" },
											message: "must be integer"
										};
										if (vErrors === null) vErrors = [err134];
										else vErrors.push(err134);
										errors++;
									}
									if (typeof data43 == "number" && isFinite(data43)) {
										if (data43 > 16384 || isNaN(data43)) {
											const err135 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/height",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/height/maximum",
												keyword: "maximum",
												params: {
													comparison: "<=",
													limit: 16384
												},
												message: "must be <= 16384"
											};
											if (vErrors === null) vErrors = [err135];
											else vErrors.push(err135);
											errors++;
										}
										if (data43 < 1 || isNaN(data43)) {
											const err136 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/height",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/height/minimum",
												keyword: "minimum",
												params: {
													comparison: ">=",
													limit: 1
												},
												message: "must be >= 1"
											};
											if (vErrors === null) vErrors = [err136];
											else vErrors.push(err136);
											errors++;
										}
									}
								}
								if (data41.pixel_count !== void 0) {
									let data44 = data41.pixel_count;
									if (!(typeof data44 == "number" && !(data44 % 1) && !isNaN(data44) && isFinite(data44))) {
										const err137 = {
											instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/pixel_count",
											schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/pixel_count/type",
											keyword: "type",
											params: { type: "integer" },
											message: "must be integer"
										};
										if (vErrors === null) vErrors = [err137];
										else vErrors.push(err137);
										errors++;
									}
									if (typeof data44 == "number" && isFinite(data44)) {
										if (data44 > 4e7 || isNaN(data44)) {
											const err138 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/pixel_count",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/pixel_count/maximum",
												keyword: "maximum",
												params: {
													comparison: "<=",
													limit: 4e7
												},
												message: "must be <= 40000000"
											};
											if (vErrors === null) vErrors = [err138];
											else vErrors.push(err138);
											errors++;
										}
										if (data44 < 1 || isNaN(data44)) {
											const err139 = {
												instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata/pixel_count",
												schemaPath: "#/properties/payloads/items/properties/profile_metadata/properties/pixel_count/minimum",
												keyword: "minimum",
												params: {
													comparison: ">=",
													limit: 1
												},
												message: "must be >= 1"
											};
											if (vErrors === null) vErrors = [err139];
											else vErrors.push(err139);
											errors++;
										}
									}
								}
							} else {
								const err140 = {
									instancePath: instancePath + "/payloads/" + i0 + "/profile_metadata",
									schemaPath: "#/properties/payloads/items/properties/profile_metadata/type",
									keyword: "type",
									params: { type: "object" },
									message: "must be object"
								};
								if (vErrors === null) vErrors = [err140];
								else vErrors.push(err140);
								errors++;
							}
						}
					} else {
						const err141 = {
							instancePath: instancePath + "/payloads/" + i0,
							schemaPath: "#/properties/payloads/items/type",
							keyword: "type",
							params: { type: "object" },
							message: "must be object"
						};
						if (vErrors === null) vErrors = [err141];
						else vErrors.push(err141);
						errors++;
					}
				}
			} else {
				const err142 = {
					instancePath: instancePath + "/payloads",
					schemaPath: "#/properties/payloads/type",
					keyword: "type",
					params: { type: "array" },
					message: "must be array"
				};
				if (vErrors === null) vErrors = [err142];
				else vErrors.push(err142);
				errors++;
			}
		}
	} else {
		const err143 = {
			instancePath,
			schemaPath: "#/type",
			keyword: "type",
			params: { type: "object" },
			message: "must be object"
		};
		if (vErrors === null) vErrors = [err143];
		else vErrors.push(err143);
		errors++;
	}
	validate25.errors = vErrors;
	return errors === 0;
}
validate25.evaluated = {
	props: true,
	dynamicProps: false,
	dynamicItems: false
};
Number.MAX_SAFE_INTEGER;
var EMAIL_VERIFIED_PREDICATE = "ctx.account.email-verified";
var ACCOUNT_ACTIVE_PREDICATE = "ctx.account.active";
var DEVICE_REGISTERED_PREDICATE = "ctx.viewer.device-registered";
var VIEW_EVENT_CONSENT_PREDICATE = "ctx.consent.capsule-view-event";
var CAPSULE_ACCESS_WINDOW_PREDICATE = "ctx.time.capsule-access-window";
var CTX_POLICY_PREDICATE_ORDER = Object.freeze([
	EMAIL_VERIFIED_PREDICATE,
	ACCOUNT_ACTIVE_PREDICATE,
	DEVICE_REGISTERED_PREDICATE,
	VIEW_EVENT_CONSENT_PREDICATE,
	CAPSULE_ACCESS_WINDOW_PREDICATE,
	"ctx.usage.capsule-lifetime-limit",
	"ctx.usage.capsule-account-lifetime-limit",
	"ctx.risk.ecosystem-automation-not-high"
]);
var CTX_POLICY_REQUIRED_PREDICATES = Object.freeze(CTX_POLICY_PREDICATE_ORDER.slice(0, 4));
var PolicyValidationError = class extends Error {
	issues;
	constructor(issues) {
		super("CTX policy validation failed.");
		this.issues = issues;
		this.name = "PolicyValidationError";
	}
};
function validateCtxPolicyV1(value) {
	if (!validatePolicySchema(value)) throw new PolicyValidationError(schemaIssues$1(validatePolicySchema.errors));
	const issues = [];
	let previousOrder = -1;
	const seen = /* @__PURE__ */ new Set();
	for (const [index, requirement] of value.requirements.entries()) {
		const order = CTX_POLICY_PREDICATE_ORDER.indexOf(requirement.predicate);
		if (seen.has(requirement.predicate)) issues.push({
			path: `/requirements/${index}/predicate`,
			message: "must not duplicate a predicate"
		});
		seen.add(requirement.predicate);
		if (order <= previousOrder) issues.push({
			path: `/requirements/${index}/predicate`,
			message: "must follow the canonical V1 predicate order"
		});
		previousOrder = order;
		if (requirement.predicate === "ctx.risk.ecosystem-automation-not-high") validateSecureServiceIssuer(requirement.issuer, `/requirements/${index}/issuer`, issues);
		if (requirement.predicate === "ctx.time.capsule-access-window") validateAccessWindow(requirement, index, issues);
	}
	for (const [index, predicate] of CTX_POLICY_REQUIRED_PREDICATES.entries()) if (value.requirements[index]?.predicate !== predicate) issues.push({
		path: `/requirements/${index}`,
		message: `must be the mandatory ${predicate} requirement`
	});
	if (issues.length > 0) throw new PolicyValidationError(issues);
}
function validateAccessWindow(requirement, index, issues) {
	const path = `/requirements/${index}`;
	for (const [field, value] of [["not_before", requirement.not_before], ["not_after", requirement.not_after]]) if (value !== void 0 && !isCanonicalUtcSecond(value)) issues.push({
		path: `${path}/${field}`,
		message: "must be a canonical UTC instant"
	});
	if (requirement.not_before !== void 0 && requirement.not_after !== void 0 && Date.parse(requirement.not_before) >= Date.parse(requirement.not_after)) issues.push({
		path,
		message: "not_before must be earlier than not_after"
	});
}
function isCanonicalUtcSecond(value) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
	const milliseconds = Date.parse(value);
	return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().replace(".000Z", "Z") === value;
}
function parseCtxPolicyV1(value) {
	validateCtxPolicyV1(value);
	const requirements = value.requirements.map((requirement) => Object.freeze(structuredClone(requirement)));
	return Object.freeze({
		type: value.type,
		version: value.version,
		combiner: value.combiner,
		requirements: Object.freeze(requirements)
	});
}
function validateSecureServiceIssuer(issuer, path, issues) {
	try {
		const url = new URL(issuer);
		if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHostname$1(url.hostname)) || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsupported issuer URL components");
	} catch {
		issues.push({
			path,
			message: "must be an absolute HTTPS issuer URL, or a loopback HTTP issuer URL for local development, without credentials, query, or fragment"
		});
	}
}
function isLoopbackHostname$1(hostname) {
	return [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(hostname);
}
function schemaIssues$1(errors) {
	return (errors ?? []).map((error) => ({
		path: error.instancePath || "/",
		message: error.message ?? "is invalid"
	}));
}
//#endregion
//#region packages/capsule-core/dist/manifest.js
var PAYLOAD_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
var REQUIRED_ARCHIVE_ENTRIES = ["manifest.json", "manifest.sig"];
var ManifestValidationError = class extends Error {
	issues;
	constructor(issues) {
		super("Capsule manifest validation failed.");
		this.issues = issues;
		this.name = "ManifestValidationError";
	}
};
function isPayloadId(value) {
	return value.length <= 64 && PAYLOAD_ID_PATTERN.test(value);
}
function payloadPath(payloadId) {
	if (!isPayloadId(payloadId)) throw new ManifestValidationError([{
		path: "/payloads/id",
		message: "must be a valid V1 payload identifier"
	}]);
	return `payloads/${payloadId}.enc`;
}
function parseCapsuleManifest(value) {
	if (!validateManifestSchema(value)) throw new ManifestValidationError(schemaIssues(validateManifestSchema.errors));
	const issues = [];
	const payload = value.payloads[0];
	validateSecureServiceUrl(value.ctx.issuer, "/ctx/issuer", issues);
	validateSecureServiceUrl(payload.key_release.broker, "/payloads/0/key_release/broker", issues);
	try {
		validateCtxPolicyV1(value.policy);
	} catch (error) {
		if (error instanceof PolicyValidationError) for (const issue of error.issues) issues.push({
			path: `/policy${issue.path}`,
			message: issue.message
		});
		else throw error;
	}
	validateEncodedLength(value.creator.signing_key.public_key, 32, "/creator/signing_key/public_key", issues);
	validateEncodedLength(payload.ciphertext_sha256, 32, "/payloads/0/ciphertext_sha256", issues);
	validateEncodedLength(payload.encryption.nonce, 12, "/payloads/0/encryption/nonce", issues);
	if (payload.path !== payloadPath(payload.id)) issues.push({
		path: "/payloads/0/path",
		message: "must equal the path derived from the payload identifier"
	});
	if (payload.ciphertext_size !== payload.plaintext_size + 16) issues.push({
		path: "/payloads/0/ciphertext_size",
		message: "must equal plaintext_size plus the 16-byte GCM tag"
	});
	try {
		resolveContentProfile(value.content_profile.id, value.content_profile.version).validateDeclaration({
			contentProfile: value.content_profile,
			payload
		});
	} catch (error) {
		if (error instanceof ContentProfileValidationError) for (const issue of error.issues) issues.push({
			path: issue.path,
			message: issue.message
		});
		else throw error;
	}
	const predecessor = value.capsule.predecessor;
	if (predecessor !== void 0) {
		validateEncodedLength(predecessor.manifest_sha256, 32, "/capsule/predecessor/manifest_sha256", issues);
		if (predecessor.id === value.capsule.id) issues.push({
			path: "/capsule/predecessor/id",
			message: "must identify a different Capsule revision"
		});
		if (predecessor.revision >= value.capsule.revision) issues.push({
			path: "/capsule/predecessor/revision",
			message: "must be lower than the current revision"
		});
	} else if (value.capsule.revision !== 1) issues.push({
		path: "/capsule/revision",
		message: "must be 1 when no predecessor is declared"
	});
	if (issues.length > 0) throw new ManifestValidationError(issues);
	return value;
}
function expectedArchiveEntries(manifest) {
	return [...REQUIRED_ARCHIVE_ENTRIES, ...manifest.payloads.map((payload) => payload.path)].sort();
}
function validateArchiveEntryNames(manifest, entryNames) {
	const issues = [];
	const seen = /* @__PURE__ */ new Set();
	for (const entryName of entryNames) {
		if (seen.has(entryName)) issues.push({
			path: "/archive",
			message: `contains duplicate entry: ${entryName}`
		});
		seen.add(entryName);
	}
	const expected = expectedArchiveEntries(manifest);
	const actual = [...seen].sort();
	for (const entryName of expected) if (!seen.has(entryName)) issues.push({
		path: "/archive",
		message: `is missing required entry: ${entryName}`
	});
	for (const entryName of actual) if (!expected.includes(entryName)) issues.push({
		path: "/archive",
		message: `contains undeclared entry: ${entryName}`
	});
	if (issues.length > 0) throw new ManifestValidationError(issues);
}
function schemaIssues(errors) {
	return (errors ?? []).map((error) => ({
		path: error.instancePath || "/",
		message: error.message ?? "is invalid"
	}));
}
function validateEncodedLength(encoded, expectedBytes, path, issues) {
	try {
		if (decodeBase64Url(encoded).byteLength !== expectedBytes) issues.push({
			path,
			message: `must encode exactly ${expectedBytes} bytes`
		});
	} catch {
		issues.push({
			path,
			message: "must use canonical unpadded base64url encoding"
		});
	}
}
function validateSecureServiceUrl(value, path, issues) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopbackHostname(url.hostname)) || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsupported URL component");
	} catch {
		issues.push({
			path,
			message: "must be an absolute HTTPS identity, or a loopback HTTP identity for local development, without credentials, query, or fragment"
		});
	}
}
function isLoopbackHostname(hostname) {
	return [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(hostname);
}
var ManifestSignatureError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "ManifestSignatureError";
	}
};
function canonicalizeCapsuleManifest(value) {
	return canonicalizeJsonBytes(parseCapsuleManifest(value));
}
async function verifyDetachedEd25519(message, signature, publicKey, provider = defaultCryptoProvider$1()) {
	assertVerificationKey(publicKey);
	if (signature.byteLength !== 64) return false;
	return provider.verify(MANIFEST_SIGNATURE_ALGORITHM_ID, publicKey, asArrayBuffer$2(signature), asArrayBuffer$2(message));
}
async function verifyCapsuleManifestSignature(value, signature, provider = defaultCryptoProvider$1()) {
	const manifest = parseCapsuleManifest(value);
	const publicKey = await importEd25519PublicKey(decodeBase64Url(manifest.creator.signing_key.public_key), provider);
	return verifyDetachedEd25519(canonicalizeJsonBytes(manifest), signature, publicKey, provider);
}
async function importEd25519PublicKey(rawPublicKey, provider = defaultCryptoProvider$1()) {
	if (rawPublicKey.byteLength !== 32) throw new ManifestSignatureError("invalid_public_signing_key", "An Ed25519 public key must contain exactly 32 bytes.");
	return provider.importKey("raw", asArrayBuffer$2(rawPublicKey), MANIFEST_SIGNATURE_ALGORITHM_ID, true, ["verify"]);
}
function assertVerificationKey(key) {
	if (key.type !== "public" || key.algorithm.name !== "Ed25519" || !key.usages.includes("verify")) throw new ManifestSignatureError("invalid_public_signing_key", "Verification requires a public Ed25519 key with verify usage.");
}
function defaultCryptoProvider$1() {
	if (globalThis.crypto?.subtle === void 0) throw new ManifestSignatureError("cryptography_unavailable", "Web Cryptography is not available in this runtime.");
	return globalThis.crypto.subtle;
}
function asArrayBuffer$2(value) {
	return value.slice().buffer;
}
//#endregion
//#region packages/capsule-core/dist/payload-encryption.js
var PAYLOAD_AAD_TYPE = "ctx-capsule-payload-aad";
var WEB_CRYPTO_AES_GCM_ID = "AES-GCM";
var PayloadEncryptionError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "PayloadEncryptionError";
	}
};
function payloadEncryptionContextFromManifest(value) {
	const manifest = parseCapsuleManifest(value);
	const payload = manifest.payloads[0];
	return Object.freeze({
		type: PAYLOAD_AAD_TYPE,
		version: "1.0",
		cryptographic_suite: CAPSULE_SUITE_ID,
		capsule: Object.freeze({
			id: manifest.capsule.id,
			revision: manifest.capsule.revision
		}),
		content_profile: Object.freeze({
			id: manifest.content_profile.id,
			version: manifest.content_profile.version
		}),
		payload: Object.freeze({
			id: payload.id,
			path: payload.path,
			media_type: payload.media_type,
			plaintext_size: payload.plaintext_size
		})
	});
}
function canonicalizePayloadAssociatedData(context) {
	return canonicalizeJsonBytes(context);
}
async function decryptAes256Gcm(ciphertext, rawContentKey, nonce, associatedData, provider = defaultCryptoProvider()) {
	assertContentKey(rawContentKey);
	assertNonce(nonce);
	if (ciphertext.byteLength < CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes) throw new PayloadEncryptionError("invalid_ciphertext_length", "Ciphertext is shorter than the required authentication tag.");
	const contentKey = await importContentKey(rawContentKey, ["decrypt"], provider);
	try {
		return new Uint8Array(await provider.decrypt(aesGcmParameters(nonce, associatedData), contentKey, asArrayBuffer$1(ciphertext)));
	} catch {
		throw new PayloadEncryptionError("authentication_failed", "Payload authentication failed.");
	}
}
async function decryptPayloadV1(ciphertext, rawContentKey, nonce, context, provider = defaultCryptoProvider()) {
	const expectedCiphertextLength = context.payload.plaintext_size + CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes;
	if (ciphertext.byteLength !== expectedCiphertextLength) throw new PayloadEncryptionError("invalid_ciphertext_length", "Ciphertext length does not match the signed payload declaration.");
	const plaintext = await decryptAes256Gcm(ciphertext, rawContentKey, nonce, canonicalizePayloadAssociatedData(context), provider);
	if (plaintext.byteLength !== context.payload.plaintext_size) throw new PayloadEncryptionError("plaintext_size_mismatch", "Decrypted plaintext length does not match the signed payload declaration.");
	return plaintext;
}
async function importContentKey(rawContentKey, usages, provider) {
	return provider.importKey("raw", asArrayBuffer$1(rawContentKey), WEB_CRYPTO_AES_GCM_ID, false, usages);
}
function assertContentKey(rawContentKey) {
	if (rawContentKey.byteLength !== CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.keyBytes) throw new PayloadEncryptionError("invalid_content_key", `${PAYLOAD_ENCRYPTION_ALGORITHM_ID} requires a 32-byte content key.`);
}
function assertNonce(nonce) {
	if (nonce.byteLength !== CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.nonceBytes) throw new PayloadEncryptionError("invalid_nonce", `${PAYLOAD_ENCRYPTION_ALGORITHM_ID} requires a 12-byte nonce.`);
}
function aesGcmParameters(nonce, associatedData) {
	return {
		name: WEB_CRYPTO_AES_GCM_ID,
		iv: asArrayBuffer$1(nonce),
		additionalData: asArrayBuffer$1(associatedData),
		tagLength: CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes * 8
	};
}
function defaultCryptoProvider() {
	if (globalThis.crypto?.subtle === void 0) throw new PayloadEncryptionError("cryptography_unavailable", "Web Cryptography is not available in this runtime.");
	return globalThis.crypto.subtle;
}
function asArrayBuffer$1(value) {
	return value.slice().buffer;
}
var EntryCommitmentError = class extends Error {
	code;
	entryName;
	constructor(code, entryName, message) {
		super(message);
		this.code = code;
		this.entryName = entryName;
		this.name = "EntryCommitmentError";
	}
};
async function sha256(value, provider = defaultDigestProvider()) {
	let digest;
	try {
		digest = new Uint8Array(await provider.digest("SHA-256", asArrayBuffer(value)));
	} catch {
		throw new EntryCommitmentError("digest_failed", "", "SHA-256 computation failed.");
	}
	if (digest.byteLength !== 32) throw new EntryCommitmentError("invalid_digest_result", "", "The digest provider returned an invalid SHA-256 length.");
	return digest;
}
async function sha256Base64Url(value, provider = defaultDigestProvider()) {
	return encodeBase64Url$1(await sha256(value, provider));
}
async function validatePayloadEntryCommitment(manifest, encryptedPayload, provider = defaultDigestProvider()) {
	const payload = manifest.payloads[0];
	if (encryptedPayload.byteLength !== payload.ciphertext_size) throw new EntryCommitmentError("payload_length_mismatch", payload.path, "Encrypted payload length does not match the signed manifest declaration.");
	if (await sha256Base64Url(encryptedPayload, provider) !== payload.ciphertext_sha256) throw new EntryCommitmentError("payload_digest_mismatch", payload.path, "Encrypted payload digest does not match the signed manifest commitment.");
}
function defaultDigestProvider() {
	if (globalThis.crypto?.subtle === void 0) throw new EntryCommitmentError("cryptography_unavailable", "", "Web Cryptography is not available in this runtime.");
	return globalThis.crypto.subtle;
}
function asArrayBuffer(value) {
	return value.slice().buffer;
}
//#endregion
//#region packages/capsule-core/dist/capsule-zip.js
var LOCAL_FILE_HEADER = 67324752;
var CENTRAL_DIRECTORY_HEADER = 33639248;
var END_OF_CENTRAL_DIRECTORY = 101010256;
var ZIP_VERSION = 20;
var END_RECORD_BYTES = 22;
var V1_ENTRY_COUNT = 3;
var MAX_CAPSULE_BYTES = 27 * 1024 * 1024;
var CapsuleZipError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CapsuleZipError";
	}
};
async function verifyCapsuleZipV1(archive) {
	if (archive.byteLength > MAX_CAPSULE_BYTES) throw new CapsuleZipError("size_exceeded");
	if (archive.byteLength < END_RECORD_BYTES) throw new CapsuleZipError("invalid_entry");
	const endOffset = archive.byteLength - END_RECORD_BYTES;
	if (readU32(archive, endOffset) !== END_OF_CENTRAL_DIRECTORY) invalidEntry();
	if (readU16(archive, endOffset + 4) !== 0 || readU16(archive, endOffset + 6) !== 0 || readU16(archive, endOffset + 8) !== V1_ENTRY_COUNT || readU16(archive, endOffset + 10) !== V1_ENTRY_COUNT || readU16(archive, endOffset + 20) !== 0) invalidEntry();
	const centralSize = readU32(archive, endOffset + 12);
	const centralOffset = readU32(archive, endOffset + 16);
	if (centralOffset + centralSize !== endOffset) invalidEntry();
	const entries = [];
	let centralCursor = centralOffset;
	for (let index = 0; index < V1_ENTRY_COUNT; index++) {
		requireRange(archive, centralCursor, 46);
		if (readU32(archive, centralCursor) !== CENTRAL_DIRECTORY_HEADER || readU16(archive, centralCursor + 6) > ZIP_VERSION || readU16(archive, centralCursor + 8) !== 0 || readU16(archive, centralCursor + 10) !== 0 || readU16(archive, centralCursor + 30) !== 0 || readU16(archive, centralCursor + 32) !== 0 || readU16(archive, centralCursor + 34) !== 0 || readU16(archive, centralCursor + 36) !== 0 || readU32(archive, centralCursor + 38) !== 0) invalidEntry();
		const nameLength = readU16(archive, centralCursor + 28);
		requireRange(archive, centralCursor + 46, nameLength);
		const name = decodeEntryName(archive.subarray(centralCursor + 46, centralCursor + 46 + nameLength));
		entries.push({
			name,
			crc: readU32(archive, centralCursor + 16),
			size: readU32(archive, centralCursor + 20),
			localOffset: readU32(archive, centralCursor + 42),
			bytes: new Uint8Array()
		});
		if (readU32(archive, centralCursor + 20) !== readU32(archive, centralCursor + 24)) invalidEntry();
		centralCursor += 46 + nameLength;
	}
	if (centralCursor !== endOffset) invalidEntry();
	if (new Set(entries.map((entry) => entry.name)).size !== V1_ENTRY_COUNT) invalidEntry();
	const localOrder = [...entries].sort((left, right) => left.localOffset - right.localOffset);
	let expectedOffset = 0;
	for (const entry of localOrder) {
		if (entry.localOffset !== expectedOffset) invalidEntry();
		requireRange(archive, entry.localOffset, 30);
		if (readU32(archive, entry.localOffset) !== LOCAL_FILE_HEADER || readU16(archive, entry.localOffset + 4) > ZIP_VERSION || readU16(archive, entry.localOffset + 6) !== 0 || readU16(archive, entry.localOffset + 8) !== 0 || readU32(archive, entry.localOffset + 14) !== entry.crc || readU32(archive, entry.localOffset + 18) !== entry.size || readU32(archive, entry.localOffset + 22) !== entry.size || readU16(archive, entry.localOffset + 28) !== 0) invalidEntry();
		const nameLength = readU16(archive, entry.localOffset + 26);
		requireRange(archive, entry.localOffset + 30, nameLength + entry.size);
		if (decodeEntryName(archive.subarray(entry.localOffset + 30, entry.localOffset + 30 + nameLength)) !== entry.name) invalidEntry();
		const dataOffset = entry.localOffset + 30 + nameLength;
		entry.bytes = archive.slice(dataOffset, dataOffset + entry.size);
		if (crc32$1(entry.bytes) !== entry.crc) invalidEntry();
		expectedOffset = dataOffset + entry.size;
	}
	if (expectedOffset !== centralOffset) invalidEntry();
	const manifestEntry = entries.find((entry) => entry.name === "manifest.json");
	const signatureEntry = entries.find((entry) => entry.name === "manifest.sig");
	if (manifestEntry === void 0 || signatureEntry === void 0) invalidEntry();
	if (signatureEntry.bytes.byteLength !== 64) throw new CapsuleZipError("invalid_signature");
	let manifestValue;
	try {
		manifestValue = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestEntry.bytes));
	} catch {
		invalidEntry();
	}
	const manifest = parseCapsuleManifest(manifestValue);
	const canonicalManifest = canonicalizeCapsuleManifest(manifest);
	if (!equalBytes(manifestEntry.bytes, canonicalManifest)) invalidEntry();
	validateArchiveEntryNames(manifest, entries.map((entry) => entry.name));
	const payloadEntry = entries.find((entry) => entry.name === manifest.payloads[0].path);
	if (payloadEntry === void 0) invalidEntry();
	await validatePayloadEntryCommitment(manifest, payloadEntry.bytes);
	if (!await verifyCapsuleManifestSignature(manifest, signatureEntry.bytes)) throw new CapsuleZipError("invalid_signature");
	return Object.freeze({
		manifest,
		manifestSignature: signatureEntry.bytes,
		encryptedPayload: payloadEntry.bytes
	});
}
function crc32$1(bytes) {
	let crc = 4294967295;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
	}
	return (crc ^ 4294967295) >>> 0;
}
function readU16(source, offset) {
	requireRange(source, offset, 2);
	return source[offset] | source[offset + 1] << 8;
}
function readU32(source, offset) {
	requireRange(source, offset, 4);
	return (readU16(source, offset) | readU16(source, offset + 2) << 16) >>> 0;
}
function requireRange(source, offset, length) {
	if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > source.byteLength) invalidEntry();
}
function decodeEntryName(bytes) {
	let value;
	try {
		value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		invalidEntry();
	}
	if (value.length === 0 || !/^[a-z0-9./-]+$/.test(value)) invalidEntry();
	return value;
}
function equalBytes(left, right) {
	if (left.byteLength !== right.byteLength) return false;
	let difference = 0;
	for (let index = 0; index < left.byteLength; index++) difference |= left[index] ^ right[index];
	return difference === 0;
}
function invalidEntry() {
	throw new CapsuleZipError("invalid_entry");
}
//#endregion
//#region packages/capsule-core/dist/policy-digest.js
function canonicalizeCtxPolicyV1(value) {
	return canonicalizeJsonBytes(parseCtxPolicyV1(value));
}
async function ctxPolicySha256(value, provider) {
	return sha256Base64Url(canonicalizeCtxPolicyV1(value), provider);
}
//#endregion
//#region apps/browser-extension/src/viewer-capsule-verifier.ts
async function verifyFetchedViewerCapsule(bytes, options = {}) {
	try {
		const verified = await verifyCapsuleZipV1(bytes);
		const trustFailure = validateAcceptedProviderIdentities(verified.manifest, options);
		if (trustFailure !== void 0) return {
			ok: false,
			code: trustFailure
		};
		return {
			ok: true,
			summary: await capsuleSummary(verified.manifest),
			encryptedPayload: verified.encryptedPayload
		};
	} catch (error) {
		return {
			ok: false,
			code: verificationFailureCode(error)
		};
	}
}
function validateAcceptedProviderIdentities(manifest, options) {
	if (options.acceptedCtxIssuers !== void 0 && !options.acceptedCtxIssuers.includes(manifest.ctx.issuer)) return "untrusted_ctx_issuer";
	if (options.acceptedBrokers !== void 0 && !options.acceptedBrokers.includes(manifest.payloads[0].key_release.broker)) return "untrusted_broker";
}
async function capsuleSummary(manifest) {
	const payload = manifest.payloads[0];
	return Object.freeze({
		capsuleId: manifest.capsule.id,
		capsuleRevision: manifest.capsule.revision,
		title: manifest.description?.title,
		description: manifest.description?.description,
		contentProfileId: manifest.content_profile.id,
		contentProfileVersion: manifest.content_profile.version,
		mediaType: payload.media_type,
		payloadId: payload.id,
		payloadPath: payload.path,
		payloadPlaintextBytes: payload.plaintext_size,
		payloadNonce: decodeBase64Url(payload.encryption.nonce),
		payloadEncryptionContext: payloadEncryptionContextFromManifest(manifest),
		profileMetadata: Object.freeze({
			width: payload.profile_metadata.width,
			height: payload.profile_metadata.height,
			pixelCount: payload.profile_metadata.pixel_count
		}),
		ctxIssuer: manifest.ctx.issuer,
		policy: structuredClone(manifest.policy),
		policySha256: await ctxPolicySha256(manifest.policy),
		broker: payload.key_release.broker,
		releaseHandle: payload.key_release.handle,
		ciphertextBytes: payload.ciphertext_size
	});
}
function verificationFailureCode(error) {
	if (error instanceof CapsuleZipError) {
		if (error.code === "invalid_signature") return "invalid_signature";
		if (error.code === "size_exceeded") return "size_exceeded";
		return "invalid_archive";
	}
	if (error instanceof ManifestValidationError) return "invalid_manifest";
	if (error instanceof ManifestSignatureError) return "invalid_signature";
	return "invalid_archive";
}
//#endregion
//#region apps/browser-extension/src/viewer-account-connection.ts
var VIEWER_CREDENTIAL_STORAGE_KEYS = Object.freeze(["viewer_token", "viewer_device_id"]);
var VIEWER_TOKEN_REFRESH_BUFFER_MS = 6e4;
var ViewerCredentialStore = class {
	storage;
	devices;
	now;
	constructor(storage, devices, now = () => Date.now()) {
		this.storage = storage;
		this.devices = devices;
		this.now = now;
	}
	async save(deviceId, token) {
		if (token.tokenType !== "DPoP" || !token.scopes.includes("ctx:authorize") || token.scopes.includes("capsule:create")) throw new Error("The Viewer token is not authorization-capable.");
		await this.storage.set({
			viewer_device_id: deviceId,
			viewer_token: {
				accessToken: token.accessToken,
				tokenType: token.tokenType,
				scopes: [...token.scopes],
				expiresAt: this.now() + token.expiresIn * 1e3,
				...token.refreshToken === void 0 ? {} : { refreshToken: token.refreshToken }
			}
		});
	}
	async active() {
		const stored = await this.stored();
		return stored === void 0 || stored.expiresAt <= this.now() + VIEWER_TOKEN_REFRESH_BUFFER_MS ? void 0 : {
			token: stored.token,
			device: stored.device
		};
	}
	async stored() {
		const stored = await this.storage.get(VIEWER_CREDENTIAL_STORAGE_KEYS);
		const credential = parseStoredViewerToken(stored.viewer_token, this.now());
		const deviceId = stored.viewer_device_id;
		if (credential === void 0 || typeof deviceId !== "string") return void 0;
		const device = await this.devices.load(deviceId);
		return device === void 0 ? void 0 : {
			...credential,
			device
		};
	}
};
var ViewerAccountConnector = class {
	oauth;
	devices;
	deviceKeys;
	credentials;
	constructor(oauth, devices, deviceKeys, credentials) {
		this.oauth = oauth;
		this.devices = devices;
		this.deviceKeys = deviceKeys;
		this.credentials = credentials;
	}
	async ensureConnected(deviceName) {
		if (await this.credentials.active() !== void 0) return;
		const stored = await this.credentials.stored();
		if (stored !== void 0) {
			if (stored.token.refreshToken !== void 0) try {
				const refreshed = await this.oauth.refresh(stored.token.refreshToken, stored.device);
				await this.credentials.save(stored.device.deviceId, refreshed);
				return;
			} catch {}
			try {
				const reauthorized = await this.oauth.authorizeDevice(stored.device);
				await this.credentials.save(stored.device.deviceId, reauthorized);
				return;
			} catch {}
		}
		await this.connect(deviceName);
	}
	async connect(deviceName) {
		const bootstrap = await this.oauth.connect();
		if (bootstrap.tokenType !== "Bearer" || !bootstrap.scopes.includes("extension:connect")) throw new Error("The bootstrap token is invalid.");
		const registered = await this.devices.register(deviceName, bootstrap.accessToken);
		const keys = await this.deviceKeys.load(registered.id);
		if (keys === void 0) throw new Error("The registered device keys are unavailable.");
		const token = await this.oauth.authorizeDevice(keys);
		await this.credentials.save(registered.id, token);
	}
};
function parseStoredViewerToken(value, now) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const record = value;
	if (Object.keys(record).sort().some((key) => ![
		"accessToken",
		"expiresAt",
		"refreshToken",
		"scopes",
		"tokenType"
	].includes(key)) || typeof record.accessToken !== "string" || record.tokenType !== "DPoP" || !Array.isArray(record.scopes) || !record.scopes.every((scope) => typeof scope === "string") || !record.scopes.includes("ctx:authorize") || record.scopes.includes("capsule:create") || typeof record.expiresAt !== "number" || !Number.isFinite(record.expiresAt)) return;
	return {
		expiresAt: record.expiresAt,
		token: {
			accessToken: record.accessToken,
			tokenType: "DPoP",
			expiresIn: Math.max(1, Math.floor((record.expiresAt - now) / 1e3)),
			scopes: record.scopes,
			...typeof record.refreshToken === "string" ? { refreshToken: record.refreshToken } : {}
		}
	};
}
//#endregion
//#region apps/browser-extension/src/viewer-consent.ts
var VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY = "viewer_disclosure_consents_v1";
var ViewerDisclosureConsentStore = class {
	storage;
	now;
	constructor(storage, now = () => /* @__PURE__ */ new Date()) {
		this.storage = storage;
		this.now = now;
	}
	async hasStandingConsent(scope) {
		return (await this.records()).some((record) => consentKey(record) === consentKey(scope));
	}
	async listStandingConsents() {
		return Object.freeze((await this.records()).map((record) => Object.freeze({
			...record,
			automaticOpening: "enabled-for-matching-site-issuer-and-policy",
			ctxDisclosureScope: "account-device-policy-limits-and-key-release",
			measurementScope: "view-event-accounting-on-successful-key-release",
			retentionScope: "provider-retention-policy",
			sitePermissionPattern: `${record.siteOrigin}/*`
		})));
	}
	async grantStandingConsent(scope) {
		const record = Object.freeze({
			type: "share-capsules-viewer-disclosure-consent",
			version: 1,
			siteOrigin: normalizedSiteOrigin(scope.siteOrigin),
			ctxIssuer: normalizedHttpsIdentity(scope.ctxIssuer),
			policySha256: scope.policySha256,
			grantedAt: this.now().toISOString()
		});
		const records = (await this.records()).filter((existing) => consentKey(existing) !== consentKey(record));
		await this.storage.set({ [VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]: [...records, record] });
		return record;
	}
	async revokeStandingConsent(scope) {
		const key = consentKey(scope);
		const records = await this.records();
		const remaining = records.filter((record) => consentKey(record) !== key);
		await this.storage.set({ [VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]: remaining });
		return remaining.length !== records.length;
	}
	async revokeSiteConsents(siteOrigin) {
		const normalized = normalizedSiteOrigin(siteOrigin);
		const records = await this.records();
		const remaining = records.filter((record) => record.siteOrigin !== normalized);
		await this.storage.set({ [VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]: remaining });
		return records.length - remaining.length;
	}
	async clearStandingConsents() {
		const records = await this.records();
		await this.storage.set({ [VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]: [] });
		return records.length;
	}
	async records() {
		const stored = await this.storage.get([VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]);
		if (!Array.isArray(stored["viewer_disclosure_consents_v1"])) return [];
		return stored[VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY].flatMap((value) => {
			const record = parseRecord(value);
			return record === void 0 ? [] : [record];
		});
	}
};
function viewerConsentScope(siteOrigin, ctxIssuer, policySha256) {
	if (!/^[A-Za-z0-9_-]{43}$/u.test(policySha256)) throw new Error("The policy digest is invalid.");
	return Object.freeze({
		siteOrigin: normalizedSiteOrigin(siteOrigin),
		ctxIssuer: normalizedHttpsIdentity(ctxIssuer),
		policySha256
	});
}
function parseRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const record = value;
	try {
		if (record.type !== "share-capsules-viewer-disclosure-consent" || record.version !== 1 || typeof record.siteOrigin !== "string" || typeof record.ctxIssuer !== "string" || typeof record.policySha256 !== "string" || typeof record.grantedAt !== "string" || Number.isNaN(Date.parse(record.grantedAt))) return;
		return Object.freeze({
			type: "share-capsules-viewer-disclosure-consent",
			version: 1,
			siteOrigin: normalizedSiteOrigin(record.siteOrigin),
			ctxIssuer: normalizedHttpsIdentity(record.ctxIssuer),
			policySha256: viewerConsentScope(record.siteOrigin, record.ctxIssuer, record.policySha256).policySha256,
			grantedAt: record.grantedAt
		});
	} catch {
		return;
	}
}
function consentKey(scope) {
	return `${scope.siteOrigin}\n${scope.ctxIssuer}\n${scope.policySha256}`;
}
function normalizedSiteOrigin(value) {
	const url = new URL(value);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalDevelopmentHost(url.hostname)) || url.hash !== "" || url.username !== "" || url.password !== "") throw new Error("The site origin is invalid.");
	return url.origin;
}
function normalizedHttpsIdentity(value) {
	const url = new URL(value);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalDevelopmentHost(url.hostname)) || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("The provider identity is invalid.");
	return url.href.endsWith("/") ? url.href.slice(0, -1) : url.href;
}
function isLocalDevelopmentHost(hostname) {
	return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
//#endregion
//#region apps/browser-extension/src/viewer-device.ts
var ViewerDeviceRegistrationError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "ViewerDeviceRegistrationError";
	}
};
var ViewerDeviceRegistrar = class {
	transport;
	keyStore;
	cryptography;
	constructor(transport, keyStore, cryptography = crypto) {
		this.transport = transport;
		this.keyStore = keyStore;
		this.cryptography = cryptography;
	}
	async register(name, accessToken) {
		const keys = await ViewerDeviceKeySet.generate(this.cryptography);
		await this.keyStore.save(keys.forStorage());
		const challenge = await this.transport.createChallenge(accessToken, keys.deviceId, keys.proofPublicKey, keys.agreementPublicKey);
		const answer = await keys.answer(challenge);
		const device = await this.transport.register(accessToken, {
			challengeId: challenge.challengeId,
			name,
			...answer
		});
		if (device.proofJkt !== challenge.proofJkt || device.agreementJkt !== challenge.agreementJkt || device.id !== challenge.deviceId) throw new ViewerDeviceRegistrationError("registration_failed");
		return device;
	}
};
var FetchViewerDeviceRegistrationTransport = class {
	apiBaseUrl;
	constructor(apiBaseUrl) {
		this.apiBaseUrl = apiBaseUrl;
	}
	async createChallenge(accessToken, deviceId, proofKey, agreementKey) {
		return parseChallenge(await this.post("/api/viewer-devices/challenges", accessToken, {
			device_id: deviceId,
			proof_key: proofKey,
			agreement_key: agreementKey
		}));
	}
	async register(accessToken, input) {
		return parseRegistration(await this.post("/api/viewer-devices", accessToken, {
			challenge_id: input.challengeId,
			name: input.name,
			proof_signature: input.proofSignature,
			agreement_confirmation: input.agreementConfirmation
		}));
	}
	async post(path, accessToken, body) {
		try {
			const response = await fetch(new URL(path, this.apiBaseUrl), {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});
			const payload = await response.json();
			if (!response.ok) throw new ViewerDeviceRegistrationError("registration_failed");
			return payload;
		} catch (error) {
			if (error instanceof ViewerDeviceRegistrationError) throw error;
			throw new ViewerDeviceRegistrationError("registration_failed");
		}
	}
};
var IndexedDbViewerDeviceKeyStore = class {
	databaseName;
	storeName;
	constructor(databaseName = "share-capsules-viewer", storeName = "viewer-device-keys") {
		this.databaseName = databaseName;
		this.storeName = storeName;
	}
	async save(keys) {
		const database = await this.open();
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(this.storeName, "readwrite");
			transaction.objectStore(this.storeName).put(keys);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		database.close();
	}
	async load(deviceId) {
		const database = await this.open();
		const result = await new Promise((resolve, reject) => {
			const request = database.transaction(this.storeName, "readonly").objectStore(this.storeName).get(deviceId);
			request.onsuccess = () => resolve(isStoredViewerDeviceKeys(request.result) ? request.result : void 0);
			request.onerror = () => reject(request.error);
		});
		database.close();
		return result;
	}
	async remove(deviceId) {
		const database = await this.open();
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(this.storeName, "readwrite");
			transaction.objectStore(this.storeName).delete(deviceId);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
			transaction.onabort = () => reject(transaction.error);
		});
		database.close();
	}
	async open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.databaseName, 1);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(this.storeName)) database.createObjectStore(this.storeName, { keyPath: "deviceId" });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
};
var ViewerDeviceKeySet = class ViewerDeviceKeySet {
	deviceId;
	proofPrivateKey;
	proofPublicKey;
	agreementPrivateKey;
	agreementPublicKey;
	cryptography;
	constructor(deviceId, proofPrivateKey, proofPublicKey, agreementPrivateKey, agreementPublicKey, cryptography) {
		this.deviceId = deviceId;
		this.proofPrivateKey = proofPrivateKey;
		this.proofPublicKey = proofPublicKey;
		this.agreementPrivateKey = agreementPrivateKey;
		this.agreementPublicKey = agreementPublicKey;
		this.cryptography = cryptography;
	}
	static async generate(cryptography) {
		try {
			const proof = await cryptography.subtle.generateKey({ name: "Ed25519" }, false, ["sign", "verify"]);
			const agreement = await cryptography.subtle.generateKey({ name: "X25519" }, false, ["deriveBits"]);
			if (!isKeyPair(proof) || !isKeyPair(agreement)) throw new ViewerDeviceRegistrationError("key_generation_failed");
			const proofPublicKey = await exportPublicJwk(proof.publicKey, "Ed25519", cryptography);
			const agreementPublicKey = await exportPublicJwk(agreement.publicKey, "X25519", cryptography);
			if (proofPublicKey.x === agreementPublicKey.x) throw new ViewerDeviceRegistrationError("key_generation_failed");
			return new ViewerDeviceKeySet(cryptography.randomUUID(), proof.privateKey, proofPublicKey, agreement.privateKey, agreementPublicKey, cryptography);
		} catch (error) {
			if (error instanceof ViewerDeviceRegistrationError) throw error;
			throw new ViewerDeviceRegistrationError("key_generation_failed");
		}
	}
	async answer(challenge) {
		const proofJkt = await okpJwkThumbprint(this.proofPublicKey);
		const agreementJkt = await okpJwkThumbprint(this.agreementPublicKey);
		if (challenge.deviceId !== this.deviceId || challenge.proofJkt !== proofJkt || challenge.agreementJkt !== agreementJkt) throw new ViewerDeviceRegistrationError("challenge_mismatch");
		const message = viewerDeviceRegistrationMessage(challenge);
		const messageBytes = new TextEncoder().encode(message);
		const proofSignature = new Uint8Array(await this.cryptography.subtle.sign("Ed25519", this.proofPrivateKey, messageBytes));
		const serverPublicKey = await this.cryptography.subtle.importKey("jwk", {
			kty: "OKP",
			crv: "X25519",
			x: challenge.serverAgreementPublicKey
		}, { name: "X25519" }, false, []);
		const sharedSecret = await this.cryptography.subtle.deriveBits({
			name: "X25519",
			public: serverPublicKey
		}, this.agreementPrivateKey, 256);
		const hkdfKey = await this.cryptography.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
		const confirmationKey = await this.cryptography.subtle.deriveKey({
			name: "HKDF",
			hash: "SHA-256",
			salt: toArrayBuffer$3(decodeBase64Url(challenge.nonce)),
			info: new TextEncoder().encode("ctx-viewer-device-registration-agreement-v1")
		}, hkdfKey, {
			name: "HMAC",
			hash: "SHA-256",
			length: 256
		}, false, ["sign"]);
		const agreementConfirmation = new Uint8Array(await this.cryptography.subtle.sign("HMAC", confirmationKey, messageBytes));
		return {
			proofSignature: encodeBase64Url$1(proofSignature),
			agreementConfirmation: encodeBase64Url$1(agreementConfirmation)
		};
	}
	forStorage() {
		return {
			deviceId: this.deviceId,
			proofPrivateKey: this.proofPrivateKey,
			proofPublicKey: this.proofPublicKey,
			agreementPrivateKey: this.agreementPrivateKey,
			agreementPublicKey: this.agreementPublicKey
		};
	}
};
async function okpJwkThumbprint(jwk) {
	return sha256Base64Url(new TextEncoder().encode(`{"crv":"${jwk.crv}","kty":"OKP","x":"${jwk.x}"}`));
}
function viewerDeviceRegistrationMessage(challenge) {
	return [
		challenge.type,
		challenge.version,
		`challenge_id:${challenge.challengeId}`,
		`device_id:${challenge.deviceId}`,
		`nonce:${challenge.nonce}`,
		`proof_jkt:${challenge.proofJkt}`,
		`agreement_jkt:${challenge.agreementJkt}`,
		""
	].join("\n");
}
async function exportPublicJwk(key, curve, cryptography) {
	const exported = await cryptography.subtle.exportKey("jwk", key);
	if (exported.kty !== "OKP" || exported.crv !== curve || typeof exported.x !== "string") throw new ViewerDeviceRegistrationError("key_generation_failed");
	if (decodeBase64Url(exported.x).byteLength !== 32) throw new ViewerDeviceRegistrationError("key_generation_failed");
	return Object.freeze({
		kty: "OKP",
		crv: curve,
		x: exported.x
	});
}
function parseChallenge(value) {
	if (!isRecord$2(value)) throw new ViewerDeviceRegistrationError("invalid_response");
	const challenge = {
		type: requireLiteral(value.type, "ctx-viewer-device-registration"),
		version: requireLiteral(value.version, "1.0"),
		challengeId: requireString(value.challenge_id),
		deviceId: requireString(value.device_id),
		nonce: requireEncodedKey(value.nonce),
		proofJkt: requireEncodedKey(value.proof_jkt),
		agreementJkt: requireEncodedKey(value.agreement_jkt),
		serverAgreementPublicKey: requireEncodedKey(value.server_agreement_public_key),
		expiresAt: requireString(value.expires_at)
	};
	if (Number.isNaN(Date.parse(challenge.expiresAt))) throw new ViewerDeviceRegistrationError("invalid_response");
	return challenge;
}
function parseRegistration(value) {
	if (!isRecord$2(value) || !isRecord$2(value.device)) throw new ViewerDeviceRegistrationError("invalid_response");
	const device = value.device;
	return {
		id: requireString(device.id),
		name: requireString(device.name),
		status: requireLiteral(device.status, "active"),
		proofJkt: requireEncodedKey(device.proof_jkt),
		agreementJkt: requireEncodedKey(device.agreement_jkt),
		createdAt: requireString(device.created_at)
	};
}
function requireString(value) {
	if (typeof value !== "string" || value.length === 0) throw new ViewerDeviceRegistrationError("invalid_response");
	return value;
}
function requireEncodedKey(value) {
	const encoded = requireString(value);
	if (decodeBase64Url(encoded).byteLength !== 32) throw new ViewerDeviceRegistrationError("invalid_response");
	return encoded;
}
function requireLiteral(value, expected) {
	if (value !== expected) throw new ViewerDeviceRegistrationError("invalid_response");
	return expected;
}
function isRecord$2(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStoredViewerDeviceKeys(value) {
	if (!isRecord$2(value)) return false;
	return typeof value.deviceId === "string" && value.proofPrivateKey instanceof CryptoKey && value.agreementPrivateKey instanceof CryptoKey && isRecord$2(value.proofPublicKey) && isRecord$2(value.agreementPublicKey);
}
function isKeyPair(value) {
	return "privateKey" in value && "publicKey" in value;
}
function toArrayBuffer$3(bytes) {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}
//#endregion
//#region apps/browser-extension/src/dpop.ts
var DpopProofFactory = class {
	cryptography;
	now;
	constructor(cryptography = crypto, now = () => Date.now()) {
		this.cryptography = cryptography;
		this.now = now;
	}
	createTokenEndpointProof(tokenEndpoint, privateKey, publicKey) {
		return this.sign(tokenEndpoint, privateKey, publicKey, {});
	}
	async createResourceProof(resourceEndpoint, accessToken, privateKey, publicKey, nonce) {
		const tokenHash = await this.cryptography.subtle.digest("SHA-256", new TextEncoder().encode(accessToken));
		return this.sign(resourceEndpoint, privateKey, publicKey, {
			ath: encodeBase64Url$1(new Uint8Array(tokenHash)),
			...nonce === void 0 ? {} : { nonce }
		});
	}
	async sign(endpoint, privateKey, publicKey, additionalClaims) {
		const htu = exactTarget(endpoint);
		if (publicKey.kty !== "OKP" || publicKey.crv !== "Ed25519") throw new Error("invalid_dpop_key");
		const signingInput = `${encodeJson$1({
			typ: "dpop+jwt",
			alg: "EdDSA",
			jwk: publicKey
		})}.${encodeJson$1({
			jti: this.cryptography.randomUUID(),
			htm: "POST",
			htu,
			iat: Math.floor(this.now() / 1e3),
			...additionalClaims
		})}`;
		const signature = await this.cryptography.subtle.sign("Ed25519", privateKey, new TextEncoder().encode(signingInput));
		return `${signingInput}.${encodeBase64Url$1(new Uint8Array(signature))}`;
	}
};
function exactTarget(value) {
	const url = new URL(value);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(url.hostname)) || url.username !== "" || url.password !== "" || url.hash !== "") throw new Error("invalid_dpop_target");
	url.search = "";
	return url.toString();
}
function encodeJson$1(value) {
	return encodeBase64Url$1(new TextEncoder().encode(JSON.stringify(value)));
}
//#endregion
//#region apps/browser-extension/src/oauth.ts
var ExtensionOAuthError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "ExtensionOAuthError";
	}
};
var FetchOAuthTokenTransport = class {
	async exchange(tokenEndpoint, parameters, headers = {}) {
		try {
			const response = await fetch(tokenEndpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					...headers
				},
				body: parameters
			});
			const payload = await response.json();
			if (!response.ok) throw new ExtensionOAuthError("invalid_token_response");
			return payload;
		} catch (error) {
			if (error instanceof ExtensionOAuthError) throw error;
			throw new ExtensionOAuthError("invalid_token_response");
		}
	}
};
var ExtensionOAuthClient = class {
	configuration;
	identity;
	transport;
	cryptography;
	dpop;
	constructor(configuration, identity, transport, cryptography = crypto, dpop = new DpopProofFactory()) {
		this.configuration = configuration;
		this.identity = identity;
		this.transport = transport;
		this.cryptography = cryptography;
		this.dpop = dpop;
		validateConfiguration(configuration);
	}
	async connect() {
		const session = await AuthorizationSession.create(this.configuration, this.configuration.scopes, this.cryptography);
		const callback = await this.identity.launchWebAuthFlow(session.authorizationUrl);
		return session.exchange(callback, this.transport);
	}
	async authorizeDevice(device) {
		const session = await AuthorizationSession.create(this.configuration, this.configuration.deviceScopes, this.cryptography);
		const callback = await this.identity.launchWebAuthFlow(session.authorizationUrl);
		const proof = await this.dpop.createTokenEndpointProof(this.configuration.tokenEndpoint, device.proofPrivateKey, device.proofPublicKey);
		return session.exchange(callback, this.transport, device.deviceId, proof);
	}
	async refresh(refreshToken, device) {
		const proof = await this.dpop.createTokenEndpointProof(this.configuration.tokenEndpoint, device.proofPrivateKey, device.proofPublicKey);
		return parseTokenSet(await this.transport.exchange(this.configuration.tokenEndpoint, new URLSearchParams({
			grant_type: "refresh_token",
			client_id: this.configuration.clientId,
			refresh_token: refreshToken
		}), { DPoP: proof }), "DPoP");
	}
};
var AuthorizationSession = class AuthorizationSession {
	configuration;
	state;
	verifier;
	authorizationUrl;
	used = false;
	constructor(configuration, state, verifier, authorizationUrl) {
		this.configuration = configuration;
		this.state = state;
		this.verifier = verifier;
		this.authorizationUrl = authorizationUrl;
	}
	static async create(configuration, scopes, cryptography) {
		const state = randomBase64Url(32, cryptography);
		const verifier = randomBase64Url(64, cryptography);
		const challenge = encodeBase64Url(new Uint8Array(await cryptography.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
		const url = new URL(configuration.authorizationEndpoint);
		url.search = new URLSearchParams({
			client_id: configuration.clientId,
			redirect_uri: configuration.redirectUri,
			response_type: "code",
			scope: scopes.join(" "),
			state,
			code_challenge: challenge,
			code_challenge_method: "S256",
			prompt: "consent"
		}).toString();
		return new AuthorizationSession(configuration, state, verifier, url.toString());
	}
	async exchange(callbackValue, transport, deviceId, dpopProof) {
		if (this.used) throw new ExtensionOAuthError("session_already_used");
		this.used = true;
		const callback = parseCallback(callbackValue);
		const expected = new URL(this.configuration.redirectUri);
		if (callback.origin !== expected.origin || callback.pathname !== expected.pathname || callback.username !== "" || callback.password !== "" || callback.hash !== "") throw new ExtensionOAuthError("callback_mismatch");
		if (callback.searchParams.get("state") !== this.state) throw new ExtensionOAuthError("state_mismatch");
		if (callback.searchParams.has("error")) throw new ExtensionOAuthError("authorization_denied");
		const code = callback.searchParams.get("code");
		if (!code) throw new ExtensionOAuthError("invalid_callback");
		const parameters = new URLSearchParams({
			grant_type: "authorization_code",
			client_id: this.configuration.clientId,
			redirect_uri: this.configuration.redirectUri,
			code,
			code_verifier: this.verifier
		});
		if (deviceId !== void 0) parameters.set("device_id", deviceId);
		return parseTokenSet(await transport.exchange(this.configuration.tokenEndpoint, parameters, dpopProof === void 0 ? {} : { DPoP: dpopProof }), dpopProof === void 0 ? "Bearer" : "DPoP");
	}
};
function validateConfiguration(configuration) {
	try {
		const authorizationEndpoint = new URL(configuration.authorizationEndpoint);
		const tokenEndpoint = new URL(configuration.tokenEndpoint);
		const redirectUri = new URL(configuration.redirectUri);
		const issuer = new URL(configuration.issuer);
		if (!isSecureServiceEndpoint(issuer) || !isSecureServiceEndpoint(authorizationEndpoint) || !isSecureServiceEndpoint(tokenEndpoint) || authorizationEndpoint.origin !== issuer.origin || tokenEndpoint.origin !== issuer.origin || issuer.search !== "" || issuer.hash !== "" || redirectUri.protocol !== "https:" || redirectUri.search !== "" || redirectUri.hash !== "" || configuration.clientId.length === 0 || configuration.scopes.length === 0 || configuration.deviceScopes.length === 0) throw new ExtensionOAuthError("invalid_configuration");
	} catch (error) {
		if (error instanceof ExtensionOAuthError) throw error;
		throw new ExtensionOAuthError("invalid_configuration");
	}
}
function isSecureServiceEndpoint(url) {
	return url.protocol === "https:" || url.protocol === "http:" && [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(url.hostname);
}
function parseCallback(value) {
	try {
		return new URL(value);
	} catch {
		throw new ExtensionOAuthError("invalid_callback");
	}
}
function parseTokenSet(value, expectedTokenType) {
	if (!isRecord$1(value)) throw new ExtensionOAuthError("invalid_token_response");
	const accessToken = value.access_token;
	const tokenType = value.token_type;
	const expiresIn = value.expires_in;
	const scope = value.scope;
	const refreshToken = value.refresh_token;
	if (typeof accessToken !== "string" || accessToken.length === 0 || tokenType !== expectedTokenType || typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0 || scope !== void 0 && typeof scope !== "string" || refreshToken !== void 0 && (typeof refreshToken !== "string" || refreshToken.length === 0) || expectedTokenType === "DPoP" && typeof refreshToken !== "string") throw new ExtensionOAuthError("invalid_token_response");
	return {
		accessToken,
		tokenType: expectedTokenType,
		expiresIn,
		scopes: typeof scope === "string" && scope !== "" ? scope.split(" ") : [],
		...typeof refreshToken === "string" ? { refreshToken } : {}
	};
}
function randomBase64Url(length, cryptography) {
	const bytes = new Uint8Array(length);
	cryptography.getRandomValues(bytes);
	return encodeBase64Url(bytes);
}
function encodeBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
//#region apps/browser-extension/src/viewer-release.ts
var VIEWER_RELEASE = Object.freeze({
	name: "share-capsules-chromium-extension",
	version: "0.1.0",
	browserFamily: "Chrome",
	browserMajor: 149
});
//#endregion
//#region apps/browser-extension/src/viewer-ctx-authorization.ts
var ViewerCtxAuthorizationClient = class {
	authorizationEndpoint;
	options;
	constructor(authorizationEndpoint, options = {}) {
		this.authorizationEndpoint = authorizationEndpoint;
		this.options = options;
	}
	async authorize(summary, token, device, hostOrigin, viewEventConsent) {
		if (token.tokenType !== "DPoP" || !token.scopes.includes("ctx:authorize") || token.scopes.includes("capsule:create")) return {
			ok: false,
			code: "invalid_session"
		};
		const fetchImplementation = this.options.fetch ?? fetch;
		const dpop = this.options.dpop ?? new DpopProofFactory();
		try {
			const proof = await dpop.createResourceProof(this.authorizationEndpoint, token.accessToken, device.proofPrivateKey, device.proofPublicKey);
			const response = await fetchImplementation(this.authorizationEndpoint, {
				method: "POST",
				headers: {
					Accept: "application/json",
					Authorization: `DPoP ${token.accessToken}`,
					"Content-Type": "application/json",
					DPoP: proof
				},
				body: JSON.stringify(authorizationRequest(summary, hostOrigin, viewEventConsent))
			});
			if (response.status === 429) return {
				ok: false,
				code: "rate_limited"
			};
			const payload = await response.json();
			if (!response.ok) return authorizationFailure(payload);
			return {
				ok: true,
				authorization: parseAuthorizationResponse(payload)
			};
		} catch (error) {
			if (error instanceof ViewerCtxAuthorizationParseError) return {
				ok: false,
				code: "invalid_response"
			};
			return {
				ok: false,
				code: "network_error"
			};
		}
	}
	async createChallengeAttempt(summary, token, device, hostOrigin, returnTo) {
		const endpoint = new URL("/ctx/challenge-attempts", this.authorizationEndpoint).toString();
		const fetchImplementation = this.options.fetch ?? fetch;
		const proof = await (this.options.dpop ?? new DpopProofFactory()).createResourceProof(endpoint, token.accessToken, device.proofPrivateKey, device.proofPublicKey);
		const response = await fetchImplementation(endpoint, {
			method: "POST",
			headers: {
				Accept: "application/json",
				Authorization: `DPoP ${token.accessToken}`,
				"Content-Type": "application/json",
				DPoP: proof
			},
			body: JSON.stringify({
				...challengeAttemptRequest(summary, hostOrigin),
				return_to: returnTo
			})
		});
		const payload = await response.json();
		if (!response.ok) throw new ViewerCtxAuthorizationParseError();
		return parseChallengeAttemptResponse(payload);
	}
};
function authorizationRequest(summary, hostOrigin, viewEventConsent) {
	return {
		type: "ctx-authorization-request",
		version: 1,
		broker: summary.broker,
		host_origin: hostOrigin,
		capsule_id: summary.capsuleId,
		capsule_revision: summary.capsuleRevision,
		policy: summary.policy,
		policy_sha256: summary.policySha256,
		payload_id: summary.payloadId,
		release_handle: summary.releaseHandle,
		action: "render",
		cryptographic_suite: CAPSULE_SUITE_ID,
		view_event_consent: viewEventConsent,
		viewer: {
			name: VIEWER_RELEASE.name,
			version: VIEWER_RELEASE.version,
			browser_family: VIEWER_RELEASE.browserFamily,
			browser_major: VIEWER_RELEASE.browserMajor
		}
	};
}
function challengeAttemptRequest(summary, hostOrigin) {
	return {
		type: "ctx-challenge-attempt-request",
		version: 1,
		host_origin: hostOrigin,
		broker: summary.broker,
		capsule_id: summary.capsuleId,
		capsule_revision: summary.capsuleRevision,
		policy_sha256: summary.policySha256,
		payload_id: summary.payloadId,
		release_handle: summary.releaseHandle,
		action: "render"
	};
}
function authorizationFailure(payload) {
	if (typeof payload === "object" && payload !== null && !Array.isArray(payload) && payload.type === "ctx-error" && payload.version === 1 && payload.code === "challenge_required") return {
		ok: false,
		code: "challenge_required"
	};
	return {
		ok: false,
		code: "authorization_denied"
	};
}
function parseAuthorizationResponse(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ViewerCtxAuthorizationParseError();
	const record = value;
	if (Object.keys(record).sort().join(",") !== "expires_in,ticket,type,version" || record.type !== "ctx-authorization" || record.version !== 1 || typeof record.ticket !== "string" || record.ticket.split(".").length !== 3 || typeof record.expires_in !== "number" || !Number.isSafeInteger(record.expires_in) || record.expires_in < 1 || record.expires_in > 120) throw new ViewerCtxAuthorizationParseError();
	return Object.freeze({
		ticket: record.ticket,
		expiresIn: record.expires_in
	});
}
function parseChallengeAttemptResponse(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new ViewerCtxAuthorizationParseError();
	const record = value;
	if (record.type !== "ctx-challenge-attempt" || record.version !== 1 || typeof record.attempt_id !== "string" || typeof record.challenge_url !== "string" || typeof record.expires_in !== "number" || !Number.isSafeInteger(record.expires_in) || record.expires_in < 1) throw new ViewerCtxAuthorizationParseError();
	return Object.freeze({
		attemptId: record.attempt_id,
		challengeUrl: record.challenge_url,
		expiresIn: record.expires_in
	});
}
var ViewerCtxAuthorizationParseError = class extends Error {};
//#endregion
//#region apps/browser-extension/src/viewer-hpke.ts
var KEM_ID = new Uint8Array([0, 32]);
var KDF_ID = new Uint8Array([0, 1]);
var AEAD_ID = new Uint8Array([0, 2]);
var KEM_SUITE_ID = concat(utf8("KEM"), KEM_ID);
var HPKE_SUITE_ID = concat(utf8("HPKE"), KEM_ID, KDF_ID, AEAD_ID);
var VERSION_LABEL = utf8("HPKE-v1");
var CONTENT_KEY_BYTES = 32;
var HASH_BYTES = 32;
var NONCE_BYTES = 12;
var ENCAPSULATED_KEY_BYTES = 32;
var CIPHERTEXT_BYTES = 48;
var ViewerHpkeOpenError = class extends Error {
	constructor() {
		super("The broker key release could not be unwrapped.");
		this.name = "ViewerHpkeOpenError";
	}
};
async function openViewerContentKey(enc, ciphertext, device, claims, ticket, cryptography = crypto) {
	try {
		assertLength(enc, ENCAPSULATED_KEY_BYTES);
		assertLength(ciphertext, CIPHERTEXT_BYTES);
		const senderPublic = await cryptography.subtle.importKey("raw", toArrayBuffer$2(enc), { name: "X25519" }, false, []);
		const dh = new Uint8Array(await cryptography.subtle.deriveBits({
			name: "X25519",
			public: senderPublic
		}, device.agreementPrivateKey, 256));
		const recipientPublic = decodeBase64Url(device.agreementPublicKey.x);
		assertLength(recipientPublic, ENCAPSULATED_KEY_BYTES);
		const schedule = await hpkeKeySchedule(await kemExtractAndExpand(dh, concat(enc, recipientPublic), cryptography), ctxHpkeInfoV1(claims), cryptography);
		const plaintext = new Uint8Array(await cryptography.subtle.decrypt({
			name: "AES-GCM",
			iv: toArrayBuffer$2(schedule.baseNonce),
			additionalData: toArrayBuffer$2(await ctxHpkeAadV1(ticket)),
			tagLength: 128
		}, schedule.key, toArrayBuffer$2(ciphertext)));
		assertLength(plaintext, CONTENT_KEY_BYTES);
		return plaintext;
	} catch (error) {
		if (error instanceof ViewerHpkeOpenError) throw error;
		throw new ViewerHpkeOpenError();
	}
}
function ctxHpkeInfoV1(claims) {
	return concat(utf8("CTX-Key-Release-HPKE-v1\0"), canonicalizeJsonBytes({
		type: "ctx-key-release-context",
		version: 1,
		broker: claims.aud,
		ticket_jti: claims.jti,
		capsule_id: claims.ctx.capsule_id,
		capsule_revision: claims.ctx.capsule_revision,
		payload_id: claims.ctx.payload_id,
		release_handle: claims.ctx.release_handle,
		action: claims.ctx.action,
		cryptographic_suite: claims.ctx.cryptographic_suite,
		agreement_jkt: claims.ctx.agreement_jkt
	}));
}
async function ctxHpkeAadV1(ticket) {
	return concat(utf8("CTX-Key-Release-AAD-v1\0"), canonicalizeJsonBytes({ ticket_sha256: await sha256Base64Url(new TextEncoder().encode(ticket)) }));
}
async function kemExtractAndExpand(dh, kemContext, cryptography) {
	return labeledExpand(await labeledExtract(new Uint8Array(), KEM_SUITE_ID, "eae_prk", dh, cryptography), KEM_SUITE_ID, "shared_secret", kemContext, HASH_BYTES, cryptography);
}
async function hpkeKeySchedule(sharedSecret, info, cryptography) {
	const empty = new Uint8Array();
	const pskIdHash = await labeledExtract(empty, HPKE_SUITE_ID, "psk_id_hash", empty, cryptography);
	const infoHash = await labeledExtract(empty, HPKE_SUITE_ID, "info_hash", info, cryptography);
	const context = concat(new Uint8Array([0]), pskIdHash, infoHash);
	const secretIkm = labeledIkm(HPKE_SUITE_ID, "secret", empty);
	const rawKey = await extractAndExpand(sharedSecret, secretIkm, labeledInfo(HPKE_SUITE_ID, "key", context, CONTENT_KEY_BYTES), CONTENT_KEY_BYTES, cryptography);
	return {
		key: await cryptography.subtle.importKey("raw", toArrayBuffer$2(rawKey), { name: "AES-GCM" }, false, ["decrypt"]),
		baseNonce: await extractAndExpand(sharedSecret, secretIkm, labeledInfo(HPKE_SUITE_ID, "base_nonce", context, NONCE_BYTES), NONCE_BYTES, cryptography)
	};
}
async function labeledExtract(salt, suiteId, label, ikm, cryptography) {
	return hmac(salt.byteLength === 0 ? new Uint8Array(HASH_BYTES) : salt, labeledIkm(suiteId, label, ikm), cryptography);
}
async function labeledExpand(prk, suiteId, label, info, length, cryptography) {
	return hkdfExpand(prk, labeledInfo(suiteId, label, info, length), length, cryptography);
}
function labeledIkm(suiteId, label, ikm) {
	return concat(VERSION_LABEL, suiteId, utf8(label), ikm);
}
function labeledInfo(suiteId, label, info, length) {
	return concat(new Uint8Array([length >> 8 & 255, length & 255]), VERSION_LABEL, suiteId, utf8(label), info);
}
async function extractAndExpand(salt, ikm, info, length, cryptography) {
	return hkdfExpand(await hmac(salt.byteLength === 0 ? new Uint8Array(HASH_BYTES) : salt, ikm, cryptography), info, length, cryptography);
}
async function hkdfExpand(prk, info, length, cryptography) {
	const blocks = [];
	let previous = new Uint8Array();
	for (let counter = 1, generated = 0; generated < length; counter += 1) {
		previous = await hmac(prk, concat(previous, info, new Uint8Array([counter])), cryptography);
		blocks.push(previous);
		generated += previous.byteLength;
	}
	return copyBytes(concat(...blocks).slice(0, length));
}
async function hmac(keyBytes, data, cryptography) {
	const key = await cryptography.subtle.importKey("raw", toArrayBuffer$2(keyBytes), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	return copyBytes(new Uint8Array(await cryptography.subtle.sign("HMAC", key, toArrayBuffer$2(data))));
}
function concat(...arrays) {
	const result = new Uint8Array(arrays.reduce((sum, value) => sum + value.byteLength, 0));
	let offset = 0;
	for (const value of arrays) {
		result.set(value, offset);
		offset += value.byteLength;
	}
	return result;
}
function utf8(value) {
	return new TextEncoder().encode(value);
}
function assertLength(value, expected) {
	if (value.byteLength !== expected) throw new ViewerHpkeOpenError();
}
function toArrayBuffer$2(bytes) {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}
function copyBytes(bytes) {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy;
}
//#endregion
//#region apps/browser-extension/src/viewer-broker-redemption.ts
var ViewerBrokerRedemptionClient = class {
	options;
	constructor(options = {}) {
		this.options = options;
	}
	async redeem(summary, ticket, device) {
		const releaseEndpoint = brokerReleaseEndpoint(summary.broker);
		let claims;
		try {
			claims = await validateTicketClaims(ticket, summary, device, this.options.now);
		} catch {
			return {
				ok: false,
				code: "invalid_ticket",
				retryable: false
			};
		}
		const fetchImplementation = this.options.fetch ?? fetch;
		const proofFactory = this.options.proofFactory ?? new KeyReleaseProofFactory();
		const openContentKey = this.options.openContentKey ?? openViewerContentKey;
		try {
			const proof = await proofFactory.createProof(releaseEndpoint, ticket, device);
			const response = await fetchImplementation(releaseEndpoint, {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					ticket,
					proof,
					agreement_public_key: device.agreementPublicKey.x
				}),
				cache: "no-store",
				credentials: "omit",
				referrerPolicy: "no-referrer"
			});
			if (response.status === 429) return {
				ok: false,
				code: "rate_limited",
				retryable: true
			};
			let payload;
			try {
				payload = await response.json();
			} catch {
				return {
					ok: false,
					code: "invalid_response",
					retryable: false
				};
			}
			if (!response.ok) try {
				const error = parseCtxError(payload);
				return {
					ok: false,
					code: "release_denied",
					denialCode: error.code,
					retryable: error.retryable
				};
			} catch {
				return {
					ok: false,
					code: "invalid_response",
					retryable: false
				};
			}
			let envelope;
			try {
				envelope = parseKeyReleaseEnvelope(payload);
			} catch {
				return {
					ok: false,
					code: "invalid_response",
					retryable: false
				};
			}
			if (envelope.ticket_jti !== claims.jti || envelope.cryptographic_suite !== claims.ctx.cryptographic_suite) return {
				ok: false,
				code: "invalid_response",
				retryable: false
			};
			let contentKey;
			try {
				contentKey = await openContentKey(decodeBase64Url(envelope.enc), decodeBase64Url(envelope.ciphertext), device, claims, ticket);
			} catch {
				return {
					ok: false,
					code: "unwrap_failed",
					retryable: false
				};
			}
			return {
				ok: true,
				contentKey,
				ticketJti: envelope.ticket_jti
			};
		} catch {
			return {
				ok: false,
				code: "network_error",
				retryable: true
			};
		}
	}
};
var KeyReleaseProofFactory = class {
	cryptography;
	now;
	constructor(cryptography = crypto, now = () => Date.now()) {
		this.cryptography = cryptography;
		this.now = now;
	}
	async createProof(releaseEndpoint, ticket, device) {
		if (device.proofPublicKey.kty !== "OKP" || device.proofPublicKey.crv !== "Ed25519") throw new Error("invalid_proof_key");
		const signingInput = `${encodeJson({
			typ: "ctx-key-release-proof+jwt",
			alg: "EdDSA",
			jwk: device.proofPublicKey
		})}.${encodeJson({
			jti: this.cryptography.randomUUID(),
			htm: "POST",
			htu: exactReleaseEndpoint(releaseEndpoint),
			iat: Math.floor(this.now() / 1e3),
			tth: await sha256Base64Url(new TextEncoder().encode(ticket))
		})}`;
		const signature = await this.cryptography.subtle.sign("Ed25519", device.proofPrivateKey, new TextEncoder().encode(signingInput));
		return `${signingInput}.${encodeBase64Url$1(new Uint8Array(signature))}`;
	}
};
async function validateTicketClaims(ticket, summary, device, now) {
	const claims = decodeTicketClaims(ticket);
	if (claims.iss !== summary.ctxIssuer || claims.aud !== summary.broker || claims.ctx.capsule_id !== summary.capsuleId || claims.ctx.capsule_revision !== summary.capsuleRevision || claims.ctx.policy_sha256 !== summary.policySha256 || claims.ctx.payload_id !== summary.payloadId || claims.ctx.release_handle !== summary.releaseHandle || claims.ctx.action !== "render" || claims.ctx.cryptographic_suite !== "ctx-capsule-v1" || claims.ctx.proof_jkt !== await okpJwkThumbprint(device.proofPublicKey) || claims.ctx.agreement_jkt !== await okpJwkThumbprint(device.agreementPublicKey)) throw new Error("ticket_binding_mismatch");
	if (!serviceIdentity(claims.iss) || !serviceIdentity(claims.aud)) throw new Error("invalid_ticket_identity");
	const current = Math.floor((now ?? (() => Date.now()))() / 1e3);
	if (!Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.nbf) || !Number.isSafeInteger(claims.exp) || claims.nbf > claims.iat || claims.exp - claims.iat !== 60 || current + 5 < claims.nbf || current - 5 >= claims.exp) throw new Error("ticket_time_invalid");
	return claims;
}
function decodeTicketClaims(ticket) {
	const parts = ticket.split(".");
	if (parts.length !== 3 || parts.some((part) => part.length === 0)) throw new Error("invalid_ticket");
	const encodedClaims = parts[1];
	if (encodedClaims === void 0) throw new Error("invalid_ticket");
	const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedClaims)));
	if (!isRecord(claims) || !isRecord(claims.ctx)) throw new Error("invalid_ticket_claims");
	return claims;
}
function parseKeyReleaseEnvelope(value) {
	if (!isRecord(value)) throw new Error("invalid_key_release");
	if (Object.keys(value).sort().join(",") !== "ciphertext,cryptographic_suite,enc,ticket_jti,type,version" || value.type !== "ctx-key-release" || value.version !== 1 || value.cryptographic_suite !== "ctx-capsule-v1" || typeof value.ticket_jti !== "string" || !encodedLength(value.enc, 32) || !encodedLength(value.ciphertext, 48)) throw new Error("invalid_key_release");
	return value;
}
function parseCtxError(value) {
	const keys = isRecord(value) ? Object.keys(value).sort().join(",") : "";
	if (!isRecord(value) || keys !== "code,retryable,type,version" || value.type !== "ctx-error" || value.version !== 1 || !isViewerBrokerReleaseDenialCode(value.code) || typeof value.retryable !== "boolean") throw new Error("invalid_ctx_error");
	return {
		code: value.code,
		retryable: value.retryable
	};
}
function isViewerBrokerReleaseDenialCode(value) {
	return typeof value === "string" && [
		"invalid_request",
		"authentication_required",
		"email_verification_required",
		"account_unavailable",
		"device_registration_required",
		"consent_required",
		"policy_unsatisfied",
		"capsule_limit_reached",
		"account_capsule_limit_reached",
		"automation_risk_high",
		"challenge_required",
		"unsupported_contract",
		"invalid_proof",
		"invalid_ticket",
		"ticket_expired",
		"ticket_replayed",
		"release_unavailable",
		"temporarily_unavailable"
	].includes(value);
}
function encodedLength(value, bytes) {
	if (typeof value !== "string") return false;
	try {
		const decoded = decodeBase64Url(value);
		return decoded.byteLength === bytes && encodeBase64Url$1(decoded) === value;
	} catch {
		return false;
	}
}
function brokerReleaseEndpoint(broker) {
	return new URL(exactReleaseEndpoint(`${broker.replace(/\/$/, "")}/releases`)).toString();
}
function exactReleaseEndpoint(value) {
	const url = new URL(value);
	if (!serviceIdentity(url.origin) || url.pathname !== "/releases" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("invalid_release_endpoint");
	return url.toString();
}
function serviceIdentity(value) {
	try {
		const url = new URL(value);
		return (url.protocol === "https:" || url.protocol === "http:" && [
			"localhost",
			"127.0.0.1",
			"[::1]"
		].includes(url.hostname)) && url.username === "" && url.password === "" && (url.pathname === "" || url.pathname === "/") && url.search === "" && url.hash === "";
	} catch {
		return false;
	}
}
function encodeJson(value) {
	return encodeBase64Url$1(new TextEncoder().encode(JSON.stringify(value)));
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
//#region apps/browser-extension/src/viewer-open-queue.ts
var VIEWER_OPEN_SLOT_ACQUIRE = "share-capsules-viewer-open-slot-acquire";
var VIEWER_OPEN_SLOT_RELEASE = "share-capsules-viewer-open-slot-release";
function viewerOpenSlotAcquireMessage(requestId) {
	return {
		type: VIEWER_OPEN_SLOT_ACQUIRE,
		requestId
	};
}
function viewerOpenSlotReleaseMessage(requestId) {
	return {
		type: VIEWER_OPEN_SLOT_RELEASE,
		requestId
	};
}
//#endregion
//#region apps/browser-extension/src/static-image-creator-profile.ts
var StaticImageCreatorProfileV1 = class {
	decoder;
	id = STATIC_IMAGE_PROFILE_ID;
	version = "1.0";
	mediaTypes = STATIC_IMAGE_MEDIA_TYPES;
	constructor(decoder = new BrowserImageDecoder()) {
		this.decoder = decoder;
	}
	async inspect(source) {
		if (!Number.isSafeInteger(source.size) || source.size < 1) return invalid("empty_content", "Choose a file that contains image data.");
		if (source.size > 26214400) return invalid("encoded_size_exceeded", "The file is larger than about 26 MB.");
		let bytes;
		try {
			bytes = await source.read();
		} catch {
			return invalid("read_failed", "The selected file could not be read.");
		}
		if (bytes.byteLength !== source.size) return invalid("size_mismatch", "The selected file changed while it was being read.");
		if (bytes.byteLength > 26214400) return invalid("encoded_size_exceeded", "The file is larger than about 26 MB.");
		let parsed;
		try {
			parsed = parseStaticImage(bytes);
		} catch (error) {
			if (error instanceof ImageInspectionFailure) return invalid(error.code, error.message);
			return invalid("malformed_content", "The file is not a valid supported image.");
		}
		const limitIssues = imageLimitIssues(parsed.width, parsed.height);
		if (limitIssues.length > 0) return Object.freeze({
			valid: false,
			issues: Object.freeze(limitIssues)
		});
		let decoded;
		try {
			decoded = await this.decoder.decode(bytes, parsed.mediaType);
		} catch {
			return invalid("decode_failed", "The image could not be decoded safely.");
		}
		if (decoded.width !== parsed.width || decoded.height !== parsed.height) return invalid("malformed_content", "The decoded image dimensions do not match its file structure.");
		const pixelCount = parsed.width * parsed.height;
		return Object.freeze({
			valid: true,
			metadata: Object.freeze({
				mediaType: parsed.mediaType,
				encodedBytes: bytes.byteLength,
				width: parsed.width,
				height: parsed.height,
				pixelCount,
				nominalDecodedRgbaBytes: pixelCount * 4
			})
		});
	}
};
var BrowserImageDecoder = class {
	async decode(bytes, mediaType) {
		const bitmap = await createImageBitmap(new Blob([toArrayBuffer$1(bytes)], { type: mediaType }), { imageOrientation: "none" });
		try {
			return {
				width: bitmap.width,
				height: bitmap.height
			};
		} finally {
			bitmap.close();
		}
	}
};
var ImageInspectionFailure = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "ImageInspectionFailure";
	}
};
function parseStaticImage(bytes) {
	if (hasBytes(bytes, 0, [
		137,
		80,
		78,
		71,
		13,
		10,
		26,
		10
	])) return parsePng(bytes);
	if (hasBytes(bytes, 0, [255, 216])) return parseJpeg(bytes);
	if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return parseWebP(bytes);
	throw new ImageInspectionFailure("unsupported_content", "Choose a static JPEG, PNG, or WebP image.");
}
function parsePng(bytes) {
	let cursor = 8;
	let width = 0;
	let height = 0;
	let sawHeader = false;
	let bitDepth = 0;
	let colorType = 0;
	let sawPalette = false;
	let sawImageData = false;
	let imageDataEnded = false;
	let sawEnd = false;
	while (cursor < bytes.byteLength) {
		if (cursor + 12 > bytes.byteLength) malformed();
		const length = readU32Be(bytes, cursor);
		const type = ascii(bytes, cursor + 4, 4);
		const dataStart = cursor + 8;
		const dataEnd = dataStart + length;
		const chunkEnd = dataEnd + 4;
		if (!/^[A-Za-z]{4}$/u.test(type) || dataEnd < dataStart || chunkEnd > bytes.byteLength) malformed();
		const expectedCrc = readU32Be(bytes, dataEnd);
		if (crc32(bytes.subarray(cursor + 4, dataEnd)) !== expectedCrc) malformed();
		if (!sawHeader && type !== "IHDR") malformed();
		if (type === "IHDR") {
			if (sawHeader || length !== 13) malformed();
			width = readU32Be(bytes, dataStart);
			height = readU32Be(bytes, dataStart + 4);
			bitDepth = bytes[dataStart + 8] ?? -1;
			colorType = bytes[dataStart + 9] ?? -1;
			if (width < 1 || height < 1 || !validPngColor(bitDepth, colorType) || bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0 && bytes[dataStart + 12] !== 1) malformed();
			sawHeader = true;
		} else if (type === "PLTE") {
			if (sawPalette || sawImageData || colorType === 0 || colorType === 4 || length < 3 || length > 768 || length % 3 !== 0 || colorType === 3 && length / 3 > 2 ** bitDepth) malformed();
			sawPalette = true;
		} else if (type === "acTL" || type === "fcTL" || type === "fdAT") throw new ImageInspectionFailure("animated_content", "Animated PNG files are not supported.");
		else if (type === "IDAT") {
			if (imageDataEnded || colorType === 3 && !sawPalette) malformed();
			sawImageData = true;
		} else if (type === "IEND") {
			if (length !== 0 || !sawImageData || chunkEnd !== bytes.byteLength) malformed();
			sawEnd = true;
		} else {
			if (sawImageData) imageDataEnded = true;
			if (type[0] === type[0]?.toUpperCase()) malformed();
		}
		cursor = chunkEnd;
		if (sawEnd) break;
	}
	if (!sawHeader || !sawImageData || !sawEnd || cursor !== bytes.byteLength) malformed();
	return {
		mediaType: "image/png",
		width,
		height
	};
}
function parseJpeg(bytes) {
	let cursor = 2;
	let width = 0;
	let height = 0;
	let sawFrame = false;
	let sawScan = false;
	let inEntropy = false;
	while (cursor < bytes.byteLength) {
		if (inEntropy) {
			const marker = findJpegEntropyMarker(bytes, cursor);
			if (marker === void 0) malformed();
			cursor = marker;
			inEntropy = false;
		}
		if (bytes[cursor] !== 255) malformed();
		while (bytes[cursor] === 255) cursor++;
		const marker = bytes[cursor++];
		if (marker === void 0 || marker === 0 || marker === 216) malformed();
		if (marker === 217) {
			if (!sawFrame || !sawScan || cursor !== bytes.byteLength) malformed();
			return {
				mediaType: "image/jpeg",
				width,
				height
			};
		}
		if (marker === 1 || marker >= 208 && marker <= 215) continue;
		if (cursor + 2 > bytes.byteLength) malformed();
		const segmentLength = readU16Be(bytes, cursor);
		if (segmentLength < 2 || cursor + segmentLength > bytes.byteLength) malformed();
		const dataStart = cursor + 2;
		const dataLength = segmentLength - 2;
		if (isJpegFrameMarker(marker)) {
			if (marker !== 192 && marker !== 193 && marker !== 194) throw new ImageInspectionFailure("unsupported_content", "This JPEG encoding is not supported.");
			if (sawFrame || dataLength < 9 || bytes[dataStart] !== 8) malformed();
			height = readU16Be(bytes, dataStart + 1);
			width = readU16Be(bytes, dataStart + 3);
			const components = bytes[dataStart + 5];
			if (width < 1 || height < 1 || components === void 0 || ![
				1,
				3,
				4
			].includes(components) || dataLength !== 6 + 3 * components) malformed();
			sawFrame = true;
		} else if (marker === 218) {
			if (!sawFrame || dataLength < 6) malformed();
			const components = bytes[dataStart];
			if (components === void 0 || dataLength !== 4 + 2 * components) malformed();
			sawScan = true;
			inEntropy = true;
		} else if (marker === 226 && dataLength >= 4 && ascii(bytes, dataStart, 4) === "MPF\0") throw new ImageInspectionFailure("animated_content", "Multi-picture JPEG files are not supported.");
		cursor += segmentLength;
	}
	malformed();
}
function parseWebP(bytes) {
	if (bytes.byteLength < 20 || readU32Le(bytes, 4) + 8 !== bytes.byteLength) malformed();
	let cursor = 12;
	let canvas;
	let image;
	while (cursor < bytes.byteLength) {
		if (cursor + 8 > bytes.byteLength) malformed();
		const type = ascii(bytes, cursor, 4);
		const length = readU32Le(bytes, cursor + 4);
		const dataStart = cursor + 8;
		const dataEnd = dataStart + length;
		const chunkEnd = dataEnd + length % 2;
		if (dataEnd < dataStart || chunkEnd > bytes.byteLength) malformed();
		if (!/^[\x20-\x7e]{4}$/u.test(type)) malformed();
		if (type === "ANIM" || type === "ANMF") throw new ImageInspectionFailure("animated_content", "Animated WebP files are not supported.");
		if (type === "VP8X") {
			if (canvas !== void 0 || cursor !== 12 || length !== 10) malformed();
			const flags = bytes[dataStart];
			if (flags === void 0 || (flags & 2) !== 0) throw new ImageInspectionFailure("animated_content", "Animated WebP files are not supported.");
			if ((flags & 193) !== 0) malformed();
			canvas = {
				width: readU24Le(bytes, dataStart + 4) + 1,
				height: readU24Le(bytes, dataStart + 7) + 1
			};
		} else if (type === "VP8 ") {
			if (image !== void 0 || length < 10) malformed();
			if (((bytes[dataStart] ?? 1) & 1) !== 0 || !hasBytes(bytes, dataStart + 3, [
				157,
				1,
				42
			])) malformed();
			image = {
				width: readU16Le(bytes, dataStart + 6) & 16383,
				height: readU16Le(bytes, dataStart + 8) & 16383
			};
		} else if (type === "VP8L") {
			if (image !== void 0 || length < 5 || bytes[dataStart] !== 47) malformed();
			const bits = readU32Le(bytes, dataStart + 1);
			if (bits >>> 29 !== 0) malformed();
			image = {
				width: (bits & 16383) + 1,
				height: (bits >>> 14 & 16383) + 1
			};
		}
		cursor = chunkEnd;
	}
	if (cursor !== bytes.byteLength || image === void 0) malformed();
	const dimensions = canvas ?? image;
	if (dimensions.width < 1 || dimensions.height < 1 || canvas !== void 0 && (canvas.width !== image.width || canvas.height !== image.height)) malformed();
	return {
		mediaType: "image/webp",
		...dimensions
	};
}
function imageLimitIssues(width, height) {
	const issues = [];
	if (width > 16384 || height > 16384) issues.push(Object.freeze({
		code: "dimension_exceeded",
		message: "The image width or height is too large."
	}));
	const pixelCount = width * height;
	if (pixelCount > 4e7) issues.push(Object.freeze({
		code: "pixel_count_exceeded",
		message: "The decoded image contains too many pixels."
	}));
	if (pixelCount * 4 > 16e7) issues.push(Object.freeze({
		code: "decoded_size_exceeded",
		message: "The decoded image requires too much memory."
	}));
	return issues;
}
function invalid(code, message) {
	return Object.freeze({
		valid: false,
		issues: Object.freeze([Object.freeze({
			code,
			message
		})])
	});
}
function malformed() {
	throw new ImageInspectionFailure("malformed_content", "The file is not a valid supported image.");
}
function validPngColor(bitDepth, colorType) {
	return {
		0: [
			1,
			2,
			4,
			8,
			16
		],
		2: [8, 16],
		3: [
			1,
			2,
			4,
			8
		],
		4: [8, 16],
		6: [8, 16]
	}[colorType]?.includes(bitDepth) === true;
}
function isJpegFrameMarker(marker) {
	return marker >= 192 && marker <= 207 && marker !== 196 && marker !== 200 && marker !== 204;
}
function findJpegEntropyMarker(bytes, start) {
	let cursor = start;
	while (cursor < bytes.byteLength) {
		if (bytes[cursor] !== 255) {
			cursor++;
			continue;
		}
		const markerStart = cursor;
		while (bytes[cursor] === 255) cursor++;
		const marker = bytes[cursor];
		if (marker === 0 || marker !== void 0 && marker >= 208 && marker <= 215) {
			cursor++;
			continue;
		}
		return markerStart;
	}
}
function crc32(bytes) {
	let crc = 4294967295;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
	}
	return (crc ^ 4294967295) >>> 0;
}
function hasBytes(bytes, offset, expected) {
	return expected.every((value, index) => bytes[offset + index] === value);
}
function ascii(bytes, offset, length) {
	if (offset < 0 || offset + length > bytes.byteLength) return "";
	return String.fromCharCode(...bytes.subarray(offset, offset + length));
}
function readU16Be(bytes, offset) {
	return (bytes[offset] ?? 0) << 8 | (bytes[offset + 1] ?? 0);
}
function readU16Le(bytes, offset) {
	return (bytes[offset] ?? 0) | (bytes[offset + 1] ?? 0) << 8;
}
function readU24Le(bytes, offset) {
	return (bytes[offset] ?? 0) | (bytes[offset + 1] ?? 0) << 8 | (bytes[offset + 2] ?? 0) << 16;
}
function readU32Be(bytes, offset) {
	return (bytes[offset] ?? 0) * 16777216 + ((bytes[offset + 1] ?? 0) << 16) + ((bytes[offset + 2] ?? 0) << 8) + (bytes[offset + 3] ?? 0) >>> 0;
}
function readU32Le(bytes, offset) {
	return (bytes[offset] ?? 0) + ((bytes[offset + 1] ?? 0) << 8) + ((bytes[offset + 2] ?? 0) << 16) + (bytes[offset + 3] ?? 0) * 16777216 >>> 0;
}
function toArrayBuffer$1(value) {
	return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}
//#endregion
//#region apps/browser-extension/src/viewer-payload-renderer.ts
var ViewerPayloadRenderer = class {
	profile;
	objectUrls;
	renderTimeoutMs;
	constructor(options = {}) {
		this.profile = options.profile ?? new StaticImageCreatorProfileV1();
		this.objectUrls = options.objectUrls ?? browserObjectUrls();
		this.renderTimeoutMs = options.renderTimeoutMs ?? 5e3;
	}
	async render(summary, encryptedPayload, contentKey) {
		if (summary.contentProfileId !== "ctx.content.static-image" || summary.contentProfileVersion !== "1.0") {
			contentKey.fill(0);
			return {
				ok: false,
				code: "unsupported_profile"
			};
		}
		let plaintext;
		try {
			plaintext = await decryptPayloadV1(encryptedPayload, contentKey, summary.payloadNonce, summary.payloadEncryptionContext);
		} catch {
			contentKey.fill(0);
			return {
				ok: false,
				code: "decryption_failed"
			};
		} finally {
			contentKey.fill(0);
		}
		try {
			const inspection = await withTimeout(this.profile.inspect({
				size: plaintext.byteLength,
				read: async () => {
					if (plaintext === void 0) throw new Error("Plaintext was disposed.");
					return plaintext;
				}
			}), this.renderTimeoutMs);
			if (!inspection.valid) return {
				ok: false,
				code: "invalid_plaintext"
			};
			const metadata = inspection.metadata;
			if (metadata.mediaType !== summary.mediaType || metadata.encodedBytes !== summary.payloadPlaintextBytes || metadata.width !== summary.profileMetadata.width || metadata.height !== summary.profileMetadata.height || metadata.pixelCount !== summary.profileMetadata.pixelCount) return {
				ok: false,
				code: "profile_mismatch"
			};
			const blob = new Blob([toArrayBuffer(plaintext)], { type: metadata.mediaType });
			return {
				ok: true,
				objectUrl: this.objectUrls.create(blob),
				mediaType: metadata.mediaType,
				altText: summary.description ?? summary.title ?? "Protected Capsule content"
			};
		} catch (error) {
			if (error instanceof RenderTimeoutError) return {
				ok: false,
				code: "render_timeout"
			};
			return {
				ok: false,
				code: "render_failed"
			};
		} finally {
			plaintext?.fill(0);
		}
	}
	dispose(result) {
		if (result.ok) this.objectUrls.revoke(result.objectUrl);
	}
};
function browserObjectUrls() {
	return {
		create: (blob) => URL.createObjectURL(blob),
		revoke: (url) => URL.revokeObjectURL(url)
	};
}
function withTimeout(promise, timeoutMs) {
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return Promise.reject(new RenderTimeoutError());
	let timeout;
	return Promise.race([promise, new Promise((_, reject) => {
		timeout = setTimeout(() => reject(new RenderTimeoutError()), timeoutMs);
	})]).finally(() => {
		if (timeout !== void 0) clearTimeout(timeout);
	});
}
var RenderTimeoutError = class extends Error {
	constructor() {
		super("Viewer payload render timed out.");
		this.name = "RenderTimeoutError";
	}
};
function toArrayBuffer(value) {
	return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
}
//#endregion
//#region apps/browser-extension/src/viewer-frame-state.ts
function viewerFrameStateView(state) {
	if (state === "opened") return {
		heading: "Capsule opened",
		ariaBusy: "false",
		className: "is-open"
	};
	return {
		heading: "Capsule locked",
		ariaBusy: state === "loading" ? "true" : "false",
		className: ""
	};
}
//#endregion
//#region apps/browser-extension/src/viewer-blocker-state.ts
function viewerFetchFailureMessage(code) {
	if (code === "missing_host_permission") return "Allow this Capsule host before opening protected content from it.";
	if (code === "network_error" || code === "unexpected_status") return "This Capsule could not be reached. Check the connection, then try again.";
	if (code === "too_large") return "This Capsule is larger than this Viewer can safely open.";
	if (code === "empty_body") return "This Capsule file is empty. The protected content remains locked.";
	return "This Capsule could not be fetched safely. The protected content remains locked.";
}
function viewerFetchFailureIsRetryable(code) {
	return code === "missing_host_permission" || code === "network_error" || code === "unexpected_status";
}
function viewerAuthorizationFailureMessage(code) {
	if (code === "rate_limited") return "Opening is temporarily limited because too many Capsules were requested at once. Wait a moment, then try again.";
	if (code === "network_error") return "Share Capsules could not be reached for authorization. Check the connection, then try again.";
	if (code === "invalid_session") return "This viewer session could not be verified. Reconnect your Share Capsules account and try again.";
	if (code === "invalid_response") return "Share Capsules returned an unexpected authorization response. The protected content remains locked.";
	return "Authorization was not approved. The protected content remains locked.";
}
function viewerAuthorizationFailureIsRetryable(code) {
	return code === "network_error" || code === "rate_limited";
}
function brokerRedemptionFailureMessage(redemption, policy) {
	if (redemption.code === "rate_limited") return "Opening is temporarily limited because too many Capsules were requested at once. Wait a moment, then try again.";
	if (redemption.code === "invalid_ticket" || redemption.denialCode === "invalid_ticket") return "This opening request could not be verified. Refresh the page and try again.";
	if (redemption.denialCode === "invalid_proof") return "This viewer session could not be verified. Reconnect your Share Capsules account and try again.";
	if (redemption.denialCode === "ticket_expired" || redemption.denialCode === "ticket_replayed") return "This opening request is no longer fresh. Refresh the page and try again.";
	if (redemption.denialCode === "release_unavailable") return "This Capsule is no longer available to open.";
	if (redemption.denialCode === "capsule_limit_reached") return "This Capsule has reached its total opening limit.";
	if (redemption.denialCode === "account_capsule_limit_reached") return "Your account has reached its opening limit for this Capsule.";
	if (redemption.denialCode === "account_unavailable") return "Your Share Capsules account is not currently allowed to open this Capsule.";
	if (redemption.denialCode === "device_registration_required") return "This browser is not registered for viewing. Reconnect your Share Capsules account and try again.";
	if (redemption.denialCode === "policy_unsatisfied") return accessWindowPolicyMessage(policy) ?? "This Capsule cannot be opened right now because its access rules are not satisfied.";
	if (redemption.denialCode === "automation_risk_high") return "This Capsule cannot be opened because automated viewing protection was triggered.";
	if (brokerRedemptionFailureIsRetryable(redemption)) return "The key service is temporarily unavailable. Wait a moment, then try again.";
	return "This Capsule could not be opened safely. The protected content remains locked.";
}
function accessWindowPolicyMessage(policy) {
	const requirement = policy?.requirements.find((candidate) => candidate.predicate === CAPSULE_ACCESS_WINDOW_PREDICATE);
	if (requirement === void 0) return null;
	const now = Date.now();
	if (requirement.not_before !== void 0) {
		const notBefore = Date.parse(requirement.not_before);
		if (Number.isFinite(notBefore) && now < notBefore) return `This Time Capsule cannot be opened yet. It unlocks on ${formatUtcPolicyInstant(requirement.not_before)}.`;
	}
	if (requirement.not_after !== void 0) {
		const notAfter = Date.parse(requirement.not_after);
		if (Number.isFinite(notAfter) && now >= notAfter) return `This Time Capsule is closed. Its opening window ended on ${formatUtcPolicyInstant(requirement.not_after)}.`;
	}
	return null;
}
function formatUtcPolicyInstant(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone: "UTC",
		timeZoneName: "short"
	}).format(date);
}
function brokerRedemptionFailureIsRetryable(redemption) {
	return redemption.code === "rate_limited" || redemption.code === "network_error" || redemption.retryable || redemption.denialCode === "temporarily_unavailable";
}
//#endregion
//#region apps/browser-extension/src/viewer-storage-policy.ts
var VIEWER_ALLOWED_STORAGE_KEYS = Object.freeze([...VIEWER_CREDENTIAL_STORAGE_KEYS, VIEWER_DISCLOSURE_CONSENT_STORAGE_KEY]);
var VIEWER_ALLOWED_STORAGE_KEY_SET = new Set(VIEWER_ALLOWED_STORAGE_KEYS);
function guardedViewerStorage(storage) {
	return Object.freeze({
		get: async (keys) => {
			assertAllowedViewerStorageKeys(keys);
			return storage.get(keys);
		},
		set: async (items) => {
			assertAllowedViewerStorageKeys(Object.keys(items));
			return storage.set(items);
		}
	});
}
function assertAllowedViewerStorageKeys(keys) {
	for (const key of keys) if (!VIEWER_ALLOWED_STORAGE_KEY_SET.has(key)) throw new Error(`Viewer storage key is not approved: ${key}`);
}
//#endregion
//#region apps/browser-extension/src/extension-runtime-config.ts
var CONTROL_PLANE = "https://sharecapsules.com";
var EXTENSION_ID = "jkejpdcobbbeichpodpeoiilnalepdph";
var OAUTH_CLIENT_ID = "418997f0-d3bd-4f91-811b-3352a006220f";
//#endregion
//#region apps/browser-extension/src/viewer-frame.ts
var CHALLENGE_REDIRECT_URI = `https://${EXTENSION_ID}.chromiumapp.org/challenge/callback`;
var frameParameters = new URL(location.href).searchParams;
var capsuleUrl = frameParameters.get("capsule");
var siteOrigin = frameParameters.get("site");
var debugEnabled = frameParameters.get("debug") === "1";
var imageFit = viewerImageFitParameter(frameParameters.get("image_fit"));
var shellElement = document.querySelector("[data-viewer-shell]");
var statusElement = document.querySelector("[data-viewer-status]");
var urlElement = document.querySelector("[data-viewer-capsule-url]");
var actionsElement = document.querySelector("[data-viewer-actions]");
var renderElement = document.querySelector("[data-viewer-render]");
var headingElement = document.querySelector("[data-viewer-heading]");
var activeRenderedPayload;
var stopWaitingForViewerCredentials;
var resumeAfterConnectionRunning = false;
var activeOpenSlotRelease;
var activeOpenAttempt;
var payloadOpened = false;
initializeViewerFrame();
async function initializeViewerFrame() {
	document.body.dataset.imageFit = imageFit;
	if (!(statusElement instanceof HTMLElement) || !(urlElement instanceof HTMLElement) || !(actionsElement instanceof HTMLElement) || !(renderElement instanceof HTMLElement)) return;
	actionsElement.replaceChildren();
	if (capsuleUrl === null || capsuleUrl.trim() === "") {
		setViewerFrameState("error", "No Capsule URL was provided to this Viewer frame.");
		urlElement.textContent = "";
		return;
	}
	if (siteOrigin === null || siteOrigin.trim() === "") {
		setViewerFrameState("error", "No Host site origin was provided to this Viewer frame.");
		urlElement.textContent = capsuleUrl;
		return;
	}
	const verifiedSiteOrigin = siteOrigin;
	debugLog("frame_initialized", {
		siteOrigin: verifiedSiteOrigin,
		capsuleOrigin: safeOrigin(capsuleUrl)
	});
	setViewerFrameState("loading", "Fetching this Capsule safely before verification.");
	urlElement.textContent = capsuleUrl;
	const fetchResult = await fetchViewerCapsule(capsuleUrl, { hostPermissions: { contains: async (permission) => chrome.permissions.contains({ origins: [permission] }) } });
	if (!fetchResult.ok) {
		debugLog("fetch_failed", { code: fetchResult.code });
		if (fetchResult.code === "missing_host_permission") {
			showCapsuleHostPermissionBlocker(fetchResult);
			return;
		}
		showBlocker(statusElement, actionsElement, viewerFetchFailureMessage(fetchResult.code), viewerFetchFailureIsRetryable(fetchResult.code), async () => {
			await initializeViewerFrame();
		});
		return;
	}
	debugLog("fetched", {
		bytes: fetchResult.bytes.byteLength,
		capsuleOrigin: safeOrigin(fetchResult.url)
	});
	setViewerFrameState("loading", `Capsule fetched safely (${formatBytes(fetchResult.bytes.byteLength)}). Verifying its signed package.`);
	urlElement.textContent = fetchResult.url;
	const verificationResult = await verifyFetchedViewerCapsule(fetchResult.bytes);
	if (!verificationResult.ok) {
		debugLog("verification_failed", { code: verificationResult.code });
		setViewerFrameState("error", "This Capsule could not be verified safely. The protected content remains locked.");
		postViewerState("error", { errorMessage: "This Capsule could not be verified safely." });
		return;
	}
	debugLog("verified", debugSummary(verificationResult.summary));
	await renderAuthorizationGate(statusElement, actionsElement, verifiedSiteOrigin, verificationResult.summary, verificationResult.encryptedPayload);
}
function showCapsuleHostPermissionBlocker(result) {
	if (result.code !== "missing_host_permission" || result.permission === void 0) return;
	const permission = result.permission;
	if (!(actionsElement instanceof HTMLElement)) {
		setViewerFrameState("error", "This Capsule host must be allowed before protected content can open.");
		postViewerState("error", { errorMessage: "This Capsule host must be allowed before protected content can open." });
		return;
	}
	const hostLabel = result.origin ?? result.permission;
	const message = `Allow ${hostLabel} as a Capsule host before opening protected content from it.`;
	actionsElement.replaceChildren();
	setViewerFrameState("action_required", message);
	postViewerState("action_required", { errorMessage: message });
	const allow = button("Allow Capsule host");
	allow.addEventListener("click", () => {
		withDisabledButton(allow, async () => {
			if (await chrome.permissions.request({ origins: [permission] })) {
				actionsElement.replaceChildren();
				await initializeViewerFrame();
				return;
			}
			setViewerFrameState("action_required", `Capsule host access was not granted for ${hostLabel}. The protected content remains locked.`);
		});
	});
	actionsElement.append(allow);
}
function viewerImageFitParameter(value) {
	return value === "cover" || value === "fill" || value === "full-height" || value === "scale-down" ? value : "contain";
}
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} bytes`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function setViewerFrameState(state, message) {
	const view = viewerFrameStateView(state);
	if (shellElement instanceof HTMLElement) {
		shellElement.dataset.viewerState = state;
		shellElement.setAttribute("aria-busy", view.ariaBusy);
		shellElement.classList.toggle("is-open", view.className === "is-open");
	}
	if (headingElement instanceof HTMLElement) headingElement.textContent = view.heading;
	if (statusElement instanceof HTMLElement) statusElement.textContent = message;
}
async function renderAuthorizationGate(status, actions, currentSiteOrigin, summary, encryptedPayload) {
	const runtime = viewerRuntime();
	const active = await runtime.credentials.active();
	const scope = viewerConsentScope(currentSiteOrigin, summary.ctxIssuer, summary.policySha256);
	const hasStandingConsent = await runtime.consents.hasStandingConsent(scope);
	actions.replaceChildren();
	if (active === void 0) {
		debugLog("account_connection_required", debugSummary(summary));
		postViewerState("action_required", metadataFromSummary(summary));
		waitForSharedViewerCredential(async () => {
			await renderAuthorizationGate(status, actions, currentSiteOrigin, summary, encryptedPayload);
		});
		setViewerFrameState("action_required", `Verified “${summary.title ?? "Capsule"}”. Connect your Share Capsules account to continue.`);
		const connect = button("Connect account");
		connect.addEventListener("click", () => {
			withDisabledButton(connect, async () => {
				setViewerFrameState("loading", "Connecting your Share Capsules account and registered device.");
				await runtime.connector.ensureConnected("Viewer extension");
				await resumeAfterSharedConnection(async () => {
					await renderAuthorizationGate(status, actions, currentSiteOrigin, summary, encryptedPayload);
				});
			});
		});
		actions.append(connect);
		return;
	}
	stopWaitingForViewerCredentials?.();
	if (hasStandingConsent) {
		debugLog("standing_consent_available", debugSummary(summary));
		await authorizeVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, active.token, active.device);
		return;
	}
	debugLog("consent_required", debugSummary(summary));
	postViewerState("action_required", metadataFromSummary(summary));
	setViewerFrameState("action_required", `Verified “${summary.title ?? "Capsule"}”. Approve view-event accounting before authorization.`);
	const remember = checkbox("Remember this consent for this site when the signed policy is unchanged.");
	const approve = button("Approve and continue");
	approve.addEventListener("click", () => {
		withDisabledButton(approve, async () => {
			if (remember.input.checked) await runtime.consents.grantStandingConsent(scope);
			actions.replaceChildren();
			await authorizeVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, active.token, active.device);
		});
	});
	actions.append(text("Opening will ask Share Capsules to check your account, this registered device, the creator’s limits, and this Capsule’s policy. A successful key release counts as an opening."), remember.label, approve);
}
function viewerRuntime() {
	const deviceKeys = new IndexedDbViewerDeviceKeyStore();
	const viewerStorage = guardedViewerStorage(chrome.storage.local);
	const credentials = new ViewerCredentialStore(viewerStorage, deviceKeys);
	return {
		credentials,
		connector: new ViewerAccountConnector(new ExtensionOAuthClient({
			issuer: CONTROL_PLANE,
			authorizationEndpoint: `${CONTROL_PLANE}/oauth/authorize`,
			tokenEndpoint: `${CONTROL_PLANE}/oauth/token`,
			clientId: OAUTH_CLIENT_ID,
			redirectUri: `https://${EXTENSION_ID}.chromiumapp.org/oauth/callback`,
			scopes: ["extension:connect"],
			deviceScopes: ["ctx:authorize"]
		}, new ChromeIdentityFlow(), new FetchOAuthTokenTransport()), new ViewerDeviceRegistrar(new FetchViewerDeviceRegistrationTransport(CONTROL_PLANE), deviceKeys), deviceKeys, credentials),
		consents: new ViewerDisclosureConsentStore(viewerStorage),
		authorization: new ViewerCtxAuthorizationClient(`${CONTROL_PLANE}/ctx/authorize`),
		redemption: new ViewerBrokerRedemptionClient(),
		renderer: new ViewerPayloadRenderer()
	};
}
async function authorizeVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device) {
	if (payloadOpened) return;
	if (activeOpenAttempt !== void 0) return activeOpenAttempt;
	activeOpenAttempt = authorizeVerifiedCapsuleOnce(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device).finally(() => {
		activeOpenAttempt = void 0;
	});
	return activeOpenAttempt;
}
async function authorizeVerifiedCapsuleOnce(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device) {
	const releaseOpenSlot = await acquireViewerOpenSlot(status, summary);
	try {
		if (payloadOpened) return;
		await authorizeAndOpenVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device);
	} finally {
		await releaseOpenSlot();
	}
}
async function authorizeAndOpenVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device) {
	setViewerFrameState("loading", `Requesting authorization for “${summary.title ?? "Capsule"}”.`);
	const authorization = await runtime.authorization.authorize(summary, token, device, currentSiteOrigin, true);
	if (!authorization.ok) {
		if (authorization.code === "challenge_required") {
			await showChallengeRequired(status, runtime, currentSiteOrigin, summary, encryptedPayload);
			return;
		}
		debugLog("authorization_failed", {
			code: authorization.code,
			...debugSummary(summary)
		});
		showBlocker(status, document.querySelector("[data-viewer-actions]"), viewerAuthorizationFailureMessage(authorization.code), viewerAuthorizationFailureIsRetryable(authorization.code), async () => {
			await authorizeVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device);
		}, metadataFromSummary(summary));
		return;
	}
	debugLog("authorization_approved", debugSummary(summary));
	setViewerFrameState("loading", `Authorization approved for “${summary.title ?? "Capsule"}”. Requesting the key from the broker.`);
	const redemption = await runtime.redemption.redeem(summary, authorization.authorization.ticket, device);
	if (!redemption.ok) {
		const message = brokerRedemptionFailureMessage(redemption, summary.policy);
		debugLog("redemption_failed", {
			code: redemption.code,
			denialCode: redemption.denialCode,
			retryable: redemption.retryable,
			...debugSummary(summary)
		});
		showBlocker(status, document.querySelector("[data-viewer-actions]"), message, brokerRedemptionFailureIsRetryable(redemption), async () => {
			await authorizeVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, token, device);
		}, metadataFromSummary(summary));
		return;
	}
	debugLog("key_released", debugSummary(summary));
	setViewerFrameState("loading", `Key released for “${summary.title ?? "Capsule"}”. Opening locally inside the extension.`);
	const rendered = await runtime.renderer.render(summary, encryptedPayload, redemption.contentKey);
	if (!rendered.ok) {
		debugLog("render_failed", {
			code: rendered.code,
			...debugSummary(summary)
		});
		setViewerFrameState("error", "This Capsule could not be decrypted and displayed safely. The protected content remains locked.");
		postViewerState("error", {
			...metadataFromSummary(summary),
			errorMessage: "This Capsule could not be decrypted and displayed safely."
		});
		return;
	}
	showRenderedPayload(runtime.renderer, rendered);
	payloadOpened = true;
	setViewerFrameState("opened", `Opened “${summary.title ?? "Capsule"}” locally inside the Share Capsules Viewer.`);
	postViewerState("opened", metadataFromSummary(summary));
	debugLog("opened", {
		...debugSummary(summary),
		mediaType: rendered.mediaType,
		plaintextBytes: summary.payloadPlaintextBytes
	});
}
async function showChallengeRequired(status, runtime, currentSiteOrigin, summary, encryptedPayload) {
	const actions = document.querySelector("[data-viewer-actions]");
	const message = "This Trust Capsule needs a quick access-confidence check before opening.";
	if (!(actions instanceof HTMLElement)) {
		setViewerFrameState("error", message);
		postViewerState("error", {
			...metadataFromSummary(summary),
			errorMessage: message
		});
		return;
	}
	actions.replaceChildren();
	setViewerFrameState("action_required", message);
	postViewerState("action_required", {
		...metadataFromSummary(summary),
		errorMessage: message
	});
	const start = button("Start quick check");
	start.addEventListener("click", () => {
		withDisabledButton(start, async () => {
			await runtime.connector.ensureConnected("Viewer extension");
			const challengeSession = await runtime.credentials.active();
			if (challengeSession === void 0) throw new Error("The Viewer session is unavailable.");
			const challenge = await runtime.authorization.createChallengeAttempt(summary, challengeSession.token, challengeSession.device, currentSiteOrigin, CHALLENGE_REDIRECT_URI);
			const callback = await new ChromeIdentityFlow().launchWebAuthFlow(challenge.challengeUrl);
			if (new URL(callback).searchParams.get("status") !== "completed") throw new Error("The challenge was not completed.");
			await runtime.connector.ensureConnected("Viewer extension");
			const active = await runtime.credentials.active();
			if (active === void 0) throw new Error("The Viewer session is unavailable.");
			actions.replaceChildren();
			await authorizeAndOpenVerifiedCapsule(status, runtime, currentSiteOrigin, summary, encryptedPayload, active.token, active.device);
		});
	});
	actions.append(start);
}
function postViewerState(state, metadata = {}) {
	if (capsuleUrl === null || siteOrigin === null) return;
	window.parent.postMessage(viewerStateMessage(capsuleUrl, state, metadata), siteOrigin);
}
function showBlocker(status, actions, message, retryable, retry, metadata = {}) {
	if (!(actions instanceof HTMLElement)) {
		setViewerFrameState("error", message);
		postViewerState("error", {
			...metadata,
			errorMessage: message
		});
		return;
	}
	actions.replaceChildren();
	if (!retryable) {
		setViewerFrameState("error", message);
		postViewerState("error", {
			...metadata,
			errorMessage: message
		});
		return;
	}
	setViewerFrameState("action_required", message);
	postViewerState("action_required", {
		...metadata,
		errorMessage: message
	});
	const retryButton = button("Try again");
	retryButton.addEventListener("click", () => {
		withDisabledButton(retryButton, async () => {
			actions.replaceChildren();
			await retry();
		});
	});
	actions.append(retryButton);
}
function metadataFromSummary(summary) {
	return {
		title: summary.title,
		description: summary.description
	};
}
async function acquireViewerOpenSlot(status, summary) {
	const requestId = `viewer-open-${crypto.randomUUID().replaceAll("-", "")}`;
	setViewerFrameState("loading", `Waiting to open “${summary.title ?? "Capsule"}” safely.`);
	if (!isViewerOpenSlotAcquireResponse(await chrome.runtime.sendMessage(viewerOpenSlotAcquireMessage(requestId)))) throw new Error("The Viewer opening queue did not grant a slot.");
	debugLog("open_slot_acquired", debugSummary(summary));
	let released = false;
	const release = async () => {
		if (released) return;
		released = true;
		if (activeOpenSlotRelease === release) activeOpenSlotRelease = void 0;
		await chrome.runtime.sendMessage(viewerOpenSlotReleaseMessage(requestId));
		debugLog("open_slot_released", debugSummary(summary));
	};
	activeOpenSlotRelease = release;
	return release;
}
function isViewerOpenSlotAcquireResponse(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && value.granted === true;
}
var ChromeIdentityFlow = class {
	async launchWebAuthFlow(authorizationUrl) {
		const callback = await chrome.identity.launchWebAuthFlow({
			url: authorizationUrl,
			interactive: true
		});
		if (callback === void 0) throw new Error("The authorization flow was cancelled.");
		return callback;
	}
};
function button(label) {
	const element = document.createElement("button");
	element.type = "button";
	element.textContent = label;
	return element;
}
function text(value) {
	const element = document.createElement("p");
	element.textContent = value;
	return element;
}
function checkbox(labelText) {
	const input = document.createElement("input");
	input.type = "checkbox";
	const label = document.createElement("label");
	label.append(input, document.createTextNode(labelText));
	return {
		label,
		input
	};
}
async function withDisabledButton(buttonElement, action) {
	buttonElement.disabled = true;
	try {
		await action();
	} catch {
		setViewerFrameState("action_required", "That step could not be completed. Nothing has been opened.");
	} finally {
		buttonElement.disabled = false;
	}
}
function showRenderedPayload(renderer, rendered) {
	if (!(renderElement instanceof HTMLElement) || !rendered.ok) return;
	if (activeRenderedPayload !== void 0) renderer.dispose(activeRenderedPayload);
	activeRenderedPayload = rendered;
	const image = document.createElement("img");
	image.src = rendered.objectUrl;
	image.alt = rendered.altText;
	renderElement.replaceChildren(image);
	renderElement.classList.add("is-visible");
}
function waitForSharedViewerCredential(action) {
	stopWaitingForViewerCredentials?.();
	const listener = (changes, areaName) => {
		if (areaName !== "local" || !VIEWER_CREDENTIAL_STORAGE_KEYS.some((key) => Object.hasOwn(changes, key))) return;
		stopWaitingForViewerCredentials?.();
		resumeAfterSharedConnection(action);
	};
	chrome.storage.onChanged.addListener(listener);
	stopWaitingForViewerCredentials = () => {
		chrome.storage.onChanged.removeListener(listener);
		stopWaitingForViewerCredentials = void 0;
	};
}
async function resumeAfterSharedConnection(action) {
	if (resumeAfterConnectionRunning) return;
	resumeAfterConnectionRunning = true;
	try {
		await action();
	} finally {
		resumeAfterConnectionRunning = false;
	}
}
function debugLog(event, details = {}) {
	if (!debugEnabled) return;
	console.info("[Share Capsules Viewer]", event, details);
}
function debugSummary(summary) {
	return {
		capsule: `${shortIdentifier(summary.capsuleId)}#${summary.capsuleRevision}`,
		profile: `${summary.contentProfileId}@${summary.contentProfileVersion}`,
		mediaType: summary.mediaType,
		payloadId: summary.payloadId,
		ciphertextBytes: summary.ciphertextBytes,
		plaintextBytes: summary.payloadPlaintextBytes,
		brokerOrigin: safeOrigin(summary.broker),
		ctxOrigin: safeOrigin(summary.ctxIssuer)
	};
}
function safeOrigin(value) {
	try {
		return new URL(value).origin;
	} catch {
		return "invalid-url";
	}
}
function shortIdentifier(value) {
	return value.length <= 16 ? value : `…${value.slice(-12)}`;
}
globalThis.addEventListener("pagehide", () => {
	stopWaitingForViewerCredentials?.();
	activeOpenSlotRelease?.();
	if (activeRenderedPayload !== void 0) {
		new ViewerPayloadRenderer().dispose(activeRenderedPayload);
		activeRenderedPayload = void 0;
	}
});
//#endregion

//# sourceMappingURL=viewer-frame.js.map