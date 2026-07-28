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
//#endregion
//#region packages/capsule-core/dist/policy.js
var CTX_POLICY_TYPE = "ctx-policy";
Number.MAX_SAFE_INTEGER;
var EMAIL_VERIFIED_PREDICATE = "ctx.account.email-verified";
var ACCOUNT_ACTIVE_PREDICATE = "ctx.account.active";
var DEVICE_REGISTERED_PREDICATE = "ctx.viewer.device-registered";
var VIEW_EVENT_CONSENT_PREDICATE = "ctx.consent.capsule-view-event";
var CAPSULE_ACCESS_WINDOW_PREDICATE = "ctx.time.capsule-access-window";
var CAPSULE_LIFETIME_LIMIT_PREDICATE = "ctx.usage.capsule-lifetime-limit";
var ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE = "ctx.usage.capsule-account-lifetime-limit";
var AUTOMATION_RISK_NOT_HIGH_PREDICATE = "ctx.risk.ecosystem-automation-not-high";
var CTX_POLICY_PREDICATE_ORDER = Object.freeze([
	EMAIL_VERIFIED_PREDICATE,
	ACCOUNT_ACTIVE_PREDICATE,
	DEVICE_REGISTERED_PREDICATE,
	VIEW_EVENT_CONSENT_PREDICATE,
	CAPSULE_ACCESS_WINDOW_PREDICATE,
	CAPSULE_LIFETIME_LIMIT_PREDICATE,
	ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
	AUTOMATION_RISK_NOT_HIGH_PREDICATE
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
async function signDetachedEd25519(message, privateKey, provider = defaultCryptoProvider$1()) {
	assertSigningKey(privateKey);
	const signature = new Uint8Array(await provider.sign(MANIFEST_SIGNATURE_ALGORITHM_ID, privateKey, asArrayBuffer$2(message)));
	if (signature.byteLength !== 64) throw new ManifestSignatureError("invalid_private_signing_key", "The signing operation returned an invalid Ed25519 signature length.");
	return signature;
}
async function verifyDetachedEd25519(message, signature, publicKey, provider = defaultCryptoProvider$1()) {
	assertVerificationKey(publicKey);
	if (signature.byteLength !== 64) return false;
	return provider.verify(MANIFEST_SIGNATURE_ALGORITHM_ID, publicKey, asArrayBuffer$2(signature), asArrayBuffer$2(message));
}
async function signCapsuleManifest(value, signingKeys, provider = defaultCryptoProvider$1()) {
	const manifest = parseCapsuleManifest(value);
	assertSigningKey(signingKeys.privateKey);
	assertVerificationKey(signingKeys.publicKey);
	if (encodeBase64Url$1(new Uint8Array(await provider.exportKey("raw", signingKeys.publicKey))) !== manifest.creator.signing_key.public_key) throw new ManifestSignatureError("signing_key_mismatch", "The signing key does not match the creator key declared by the manifest.");
	const canonicalManifest = canonicalizeJsonBytes(manifest);
	const signature = await signDetachedEd25519(canonicalManifest, signingKeys.privateKey, provider);
	if (!await verifyDetachedEd25519(canonicalManifest, signature, signingKeys.publicKey, provider)) throw new ManifestSignatureError("signing_key_mismatch", "The private signing key does not match the declared creator public key.");
	return signature;
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
function assertSigningKey(key) {
	if (key.type !== "private" || key.algorithm.name !== "Ed25519" || !key.usages.includes("sign")) throw new ManifestSignatureError("invalid_private_signing_key", "Signing requires a private Ed25519 key with sign usage.");
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
var WEB_CRYPTO_AES_GCM_ID = "AES-GCM";
var PayloadEncryptionError = class extends Error {
	code;
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = "PayloadEncryptionError";
	}
};
function canonicalizePayloadAssociatedData(context) {
	return canonicalizeJsonBytes(context);
}
function generatePayloadContentKey(fillRandom = defaultRandomFiller) {
	return generateRandomBytes(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.keyBytes, fillRandom);
}
function generatePayloadNonce(fillRandom = defaultRandomFiller) {
	return generateRandomBytes(CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.nonceBytes, fillRandom);
}
async function encryptAes256Gcm(plaintext, rawContentKey, nonce, associatedData, provider = defaultCryptoProvider()) {
	assertContentKey(rawContentKey);
	assertNonce(nonce);
	const contentKey = await importContentKey(rawContentKey, ["encrypt"], provider);
	try {
		return new Uint8Array(await provider.encrypt(aesGcmParameters(nonce, associatedData), contentKey, asArrayBuffer$1(plaintext)));
	} catch {
		throw new PayloadEncryptionError("encryption_failed", "Payload encryption failed.");
	}
}
async function encryptPayloadV1(plaintext, rawContentKey, nonce, context, provider = defaultCryptoProvider()) {
	if (plaintext.byteLength !== context.payload.plaintext_size) throw new PayloadEncryptionError("plaintext_size_mismatch", "Plaintext length does not match the signed payload declaration.");
	const associatedData = canonicalizePayloadAssociatedData(context);
	const ciphertext = await encryptAes256Gcm(plaintext, rawContentKey, nonce, associatedData, provider);
	const expectedCiphertextLength = plaintext.byteLength + CAPSULE_CRYPTOGRAPHIC_SUITE_V1.payloadEncryption.tagBytes;
	if (ciphertext.byteLength !== expectedCiphertextLength) throw new PayloadEncryptionError("invalid_ciphertext_length", "Ciphertext length does not include the required authentication tag.");
	return Object.freeze({
		ciphertext,
		nonce: nonce.slice(),
		associatedData
	});
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
function defaultRandomFiller(target) {
	if (globalThis.crypto?.getRandomValues === void 0) throw new PayloadEncryptionError("cryptography_unavailable", "A cryptographically secure random source is not available in this runtime.");
	const randomBytes = new Uint8Array(target.byteLength);
	globalThis.crypto.getRandomValues(randomBytes);
	target.set(randomBytes);
}
function generateRandomBytes(length, fillRandom) {
	const value = new Uint8Array(length);
	try {
		fillRandom(value);
		return value;
	} catch (error) {
		value.fill(0);
		throw error;
	}
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
var DOS_1980_01_01 = 33;
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
async function assembleCapsuleZipV1(manifestValue, signature, encryptedPayload) {
	const manifest = parseCapsuleManifest(manifestValue);
	if (signature.byteLength !== 64) throw new CapsuleZipError("invalid_signature");
	await validatePayloadEntryCommitment(manifest, encryptedPayload);
	const entries = [
		{
			name: "manifest.json",
			bytes: canonicalizeCapsuleManifest(manifest)
		},
		{
			name: "manifest.sig",
			bytes: signature
		},
		{
			name: manifest.payloads[0].path,
			bytes: encryptedPayload
		}
	];
	validateArchiveEntryNames(manifest, entries.map((entry) => entry.name));
	if (entries.map((entry) => entry.name).sort().join("\n") !== expectedArchiveEntries(manifest).join("\n")) throw new CapsuleZipError("invalid_entry");
	return writeStoredZip(entries);
}
function writeStoredZip(entries) {
	const encoded = entries.map((entry) => ({
		...entry,
		nameBytes: new TextEncoder().encode(entry.name),
		crc: crc32$1(entry.bytes)
	}));
	let localSize = 0;
	for (const entry of encoded) {
		if (entry.nameBytes.byteLength > 65535 || entry.bytes.byteLength > 4294967295) throw new CapsuleZipError("size_exceeded");
		localSize += 30 + entry.nameBytes.byteLength + entry.bytes.byteLength;
	}
	const centralSize = encoded.reduce((size, entry) => size + 46 + entry.nameBytes.byteLength, 0);
	const totalSize = localSize + centralSize + 22;
	if (totalSize > 4294967295) throw new CapsuleZipError("size_exceeded");
	const output = new Uint8Array(totalSize);
	let cursor = 0;
	const offsets = [];
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
function crc32$1(bytes) {
	let crc = 4294967295;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
	}
	return (crc ^ 4294967295) >>> 0;
}
function writeU16(target, offset, value) {
	target[offset] = value & 255;
	target[offset + 1] = value >>> 8 & 255;
}
function writeU32(target, offset, value) {
	writeU16(target, offset, value & 65535);
	writeU16(target, offset + 2, value >>> 16);
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
//#region apps/browser-extension/src/creator-payload-secrets.ts
var CreatorPayloadSecretsError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CreatorPayloadSecretsError";
	}
};
var CreatorPayloadSecrets = class {
	destroyed = false;
	contentKeyInUse = false;
	contentKey;
	nonce;
	constructor(contentKey, nonce) {
		if (contentKey.byteLength !== 32 || nonce.byteLength !== 12) throw new CreatorPayloadSecretsError("invalid_material");
		this.contentKey = contentKey.slice();
		this.nonce = nonce.slice();
	}
	nonceBytes() {
		this.assertAvailable();
		return this.nonce.slice();
	}
	async withContentKey(operation) {
		this.assertAvailable();
		if (this.contentKeyInUse) throw new CreatorPayloadSecretsError("content_key_in_use");
		this.contentKeyInUse = true;
		const workingCopy = this.contentKey.slice();
		try {
			return await operation(workingCopy);
		} finally {
			workingCopy.fill(0);
			this.contentKeyInUse = false;
		}
	}
	destroy() {
		if (this.destroyed) return;
		this.contentKey.fill(0);
		this.nonce.fill(0);
		this.destroyed = true;
	}
	isDestroyed() {
		return this.destroyed;
	}
	assertAvailable() {
		if (this.destroyed) throw new CreatorPayloadSecretsError("destroyed");
	}
};
var CreatorPayloadSecretsFactory = class {
	fillRandom;
	constructor(fillRandom) {
		this.fillRandom = fillRandom;
	}
	create() {
		let contentKey;
		let nonce;
		try {
			contentKey = generatePayloadContentKey(this.fillRandom);
			nonce = generatePayloadNonce(this.fillRandom);
			return new CreatorPayloadSecrets(contentKey, nonce);
		} catch {
			throw new CreatorPayloadSecretsError("randomness_failed");
		} finally {
			contentKey?.fill(0);
			nonce?.fill(0);
		}
	}
};
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
		const signingInput = `${encodeJson({
			typ: "dpop+jwt",
			alg: "EdDSA",
			jwk: publicKey
		})}.${encodeJson({
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
function encodeJson(value) {
	return encodeBase64Url$1(new TextEncoder().encode(JSON.stringify(value)));
}
//#endregion
//#region apps/browser-extension/src/creator-broker-registration.ts
var CreatorBrokerRegistrationError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CreatorBrokerRegistrationError";
	}
};
var FetchJsonPostTransport = class {
	async post(endpoint, body, headers = {}) {
		const response = await fetch(endpoint, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				...headers
			},
			body: JSON.stringify(body),
			cache: "no-store",
			credentials: "omit"
		});
		let payload;
		try {
			payload = await response.json();
		} catch {
			payload = void 0;
		}
		return {
			status: response.status,
			cacheControl: response.headers.get("Cache-Control"),
			body: payload
		};
	}
};
var CreatorBrokerRegistrationClient = class {
	transport;
	proofFactory;
	grantEndpoint;
	broker;
	registrationEndpoint;
	lifecycleBaseEndpoint;
	constructor(configuration, transport = new FetchJsonPostTransport(), proofFactory = new DpopProofFactory()) {
		this.transport = transport;
		this.proofFactory = proofFactory;
		try {
			this.grantEndpoint = exactSecureUrl(configuration.grantEndpoint, false);
			this.broker = exactSecureUrl(configuration.broker, true);
			this.registrationEndpoint = `${this.broker}/registrations`;
			this.lifecycleBaseEndpoint = exactSecureUrl(configuration.lifecycleBaseEndpoint, true);
		} catch {
			throw new CreatorBrokerRegistrationError("invalid_configuration");
		}
	}
	async register(input, secrets, token, device) {
		validateInput(input);
		validateToken(token);
		try {
			if (await ctxPolicySha256(parseCtxPolicyV1(input.policy)) !== input.policySha256) throw new Error("policy_digest_mismatch");
		} catch {
			throw new CreatorBrokerRegistrationError("invalid_input");
		}
		let contentKeySha256;
		try {
			contentKeySha256 = await secrets.withContentKey(sha256Base64Url);
		} catch {
			throw new CreatorBrokerRegistrationError("registration_failed");
		}
		let proof;
		try {
			proof = await this.proofFactory.createResourceProof(this.grantEndpoint, token.accessToken, device.proofPrivateKey, device.proofPublicKey);
		} catch {
			throw new CreatorBrokerRegistrationError("grant_failed");
		}
		const grant = parseGrantResponse(await this.post(this.grantEndpoint, {
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
			content_key_sha256: contentKeySha256
		}, {
			Authorization: `DPoP ${token.accessToken}`,
			DPoP: proof
		}, "grant_failed"), this.broker);
		let registrationResponse;
		try {
			registrationResponse = await secrets.withContentKey(async (contentKey) => this.post(this.registrationEndpoint, {
				type: "broker-key-registration",
				version: 1,
				grant: grant.grant,
				registration_id: input.registrationId,
				capsule_id: input.capsuleId,
				payload_id: input.payloadId,
				content_key: encodeBase64Url$1(contentKey)
			}, {}, "registration_failed"));
		} catch (error) {
			if (error instanceof CreatorBrokerRegistrationError) throw error;
			throw new CreatorBrokerRegistrationError("registration_failed");
		}
		const releaseHandle = parseRegistrationResponse(registrationResponse);
		return Object.freeze({
			broker: this.broker,
			releaseHandle,
			registrationId: input.registrationId
		});
	}
	async finalize(registration, token, device) {
		await this.applyLifecycle("finalize", registration, { release_handle: registration.releaseHandle }, token, device, "finalization_failed");
	}
	async cancel(registration, token, device) {
		await this.applyLifecycle("cancel", registration, {}, token, device, "cancellation_failed");
	}
	async applyLifecycle(operation, registration, body, token, device, errorCode) {
		validateToken(token);
		validateRegistration(registration, this.broker);
		const endpoint = `${this.lifecycleBaseEndpoint}/${registration.registrationId}/${operation}`;
		let proof;
		try {
			proof = await this.proofFactory.createResourceProof(endpoint, token.accessToken, device.proofPrivateKey, device.proofPublicKey);
		} catch {
			throw new CreatorBrokerRegistrationError(errorCode);
		}
		const response = await this.post(endpoint, body, {
			Authorization: `DPoP ${token.accessToken}`,
			DPoP: proof
		}, errorCode);
		const value = exactRecord$1(response.body, [
			"registration_id",
			"status",
			"type",
			"version"
		], "invalid_lifecycle_response");
		const expectedStatus = operation === "finalize" ? "active" : "destroyed";
		if (response.status !== 200 || !noStore(response.cacheControl) || value.type !== "capsule-registration" || value.version !== 1 || value.registration_id !== registration.registrationId || value.status !== expectedStatus) throw new CreatorBrokerRegistrationError("invalid_lifecycle_response");
	}
	async post(endpoint, body, headers, errorCode) {
		try {
			return await this.transport.post(endpoint, body, headers);
		} catch {
			throw new CreatorBrokerRegistrationError(errorCode);
		}
	}
};
function createBrokerRegistrationId(randomUUID = () => crypto.randomUUID()) {
	return `registration_${randomUUID().replaceAll("-", "")}`;
}
function parseGrantResponse(response, expectedBroker) {
	if (response.status !== 201 || !noStore(response.cacheControl)) throw new CreatorBrokerRegistrationError("invalid_grant_response");
	const body = exactRecord$1(response.body, [
		"broker",
		"expires_in",
		"grant",
		"type",
		"version"
	], "invalid_grant_response");
	if (body.type !== "broker-registration-grant" || body.version !== 1 || body.expires_in !== 60 || typeof body.broker !== "string" || canonicalBroker(body.broker) !== expectedBroker || typeof body.grant !== "string" || !encodedLength$1(body.grant, 32)) throw new CreatorBrokerRegistrationError("invalid_grant_response");
	return { grant: body.grant };
}
function parseRegistrationResponse(response) {
	if (![200, 201].includes(response.status) || !noStore(response.cacheControl)) throw new CreatorBrokerRegistrationError("invalid_registration_response");
	const body = exactRecord$1(response.body, [
		"release_handle",
		"type",
		"version"
	], "invalid_registration_response");
	if (body.type !== "broker-key-registration" || body.version !== 1 || typeof body.release_handle !== "string" || !encodedLength$1(body.release_handle, 32)) throw new CreatorBrokerRegistrationError("invalid_registration_response");
	return body.release_handle;
}
function validateInput(input) {
	if (!/^registration_[a-f0-9]{32}$/u.test(input.registrationId) || !/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(input.capsuleId) || !Number.isSafeInteger(input.capsuleRevision) || input.capsuleRevision < 1 || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(input.payloadId) || input.payloadId.length > 64 || typeof input.title !== "string" || input.title.length < 1 || input.title.length > 200 || !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u.test(input.contentProfileId) || input.contentProfileId.length > 128 || !/^\d+\.\d+$/u.test(input.contentProfileVersion) || input.contentProfileVersion.length > 32 || !/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/u.test(input.mediaType) || input.mediaType.length > 127 || !encodedLength$1(input.policySha256, 32) || input.policy === void 0) throw new CreatorBrokerRegistrationError("invalid_input");
}
function validateToken(token) {
	if (token.tokenType !== "DPoP" || token.accessToken.length === 0 || !token.scopes.includes("capsule:create")) throw new CreatorBrokerRegistrationError("invalid_token");
}
function validateRegistration(registration, expectedBroker) {
	if (registration.broker !== expectedBroker || !/^registration_[a-f0-9]{32}$/u.test(registration.registrationId) || !encodedLength$1(registration.releaseHandle, 32)) throw new CreatorBrokerRegistrationError("invalid_input");
}
function exactRecord$1(value, expectedKeys, errorCode) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new CreatorBrokerRegistrationError(errorCode);
	const record = value;
	const actual = Object.keys(record).sort();
	const expected = [...expectedKeys].sort();
	if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new CreatorBrokerRegistrationError(errorCode);
	return record;
}
function encodedLength$1(value, expectedLength) {
	try {
		return decodeBase64Url(value).byteLength === expectedLength;
	} catch {
		return false;
	}
}
function noStore(value) {
	return value?.toLowerCase().split(",").some((part) => part.trim() === "no-store") === true;
}
function exactSecureUrl(value, normalizeTrailingSlash) {
	const url = new URL(value);
	if (url.protocol !== "https:" && !(url.protocol === "http:" && [
		"localhost",
		"127.0.0.1",
		"[::1]"
	].includes(url.hostname)) || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("invalid_url");
	if (normalizeTrailingSlash) {
		const path = url.pathname.replace(/\/+$/u, "");
		return `${url.origin}${path === "" ? "" : path}`;
	}
	return url.toString();
}
function canonicalBroker(value) {
	try {
		return exactSecureUrl(value, true);
	} catch {
		throw new CreatorBrokerRegistrationError("invalid_grant_response");
	}
}
//#endregion
//#region apps/browser-extension/src/creator-account-connection.ts
var CreatorCredentialStore = class {
	storage;
	devices;
	now;
	constructor(storage, devices, now = () => Date.now()) {
		this.storage = storage;
		this.devices = devices;
		this.now = now;
	}
	async save(deviceId, token) {
		if (token.tokenType !== "DPoP" || !token.scopes.includes("capsule:create")) throw new Error("The Creator token is not publication-capable.");
		await this.storage.set({
			creator_device_id: deviceId,
			creator_token: {
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
		return stored === void 0 || stored.expiresAt <= this.now() ? void 0 : {
			token: stored.token,
			device: stored.device
		};
	}
	async stored() {
		const stored = await this.storage.get(["creator_token", "creator_device_id"]);
		const credential = parseStoredToken(stored.creator_token, this.now());
		const deviceId = stored.creator_device_id;
		if (credential === void 0 || typeof deviceId !== "string") return void 0;
		const device = await this.devices.load(deviceId);
		return device === void 0 ? void 0 : {
			...credential,
			device
		};
	}
};
var CreatorAccountConnector = class {
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
function parseStoredToken(value, now) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const record = value;
	if (Object.keys(record).sort().some((key) => ![
		"accessToken",
		"expiresAt",
		"refreshToken",
		"scopes",
		"tokenType"
	].includes(key)) || typeof record.accessToken !== "string" || record.tokenType !== "DPoP" || !Array.isArray(record.scopes) || !record.scopes.every((scope) => typeof scope === "string") || !record.scopes.includes("capsule:create") || typeof record.expiresAt !== "number" || !Number.isFinite(record.expiresAt)) return;
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
//#region apps/browser-extension/src/creator-capsule-builder.ts
var CreatorCapsuleBuildError = class extends Error {
	code;
	detail;
	constructor(code, detail) {
		super(code);
		this.code = code;
		this.detail = detail;
		this.name = "CreatorCapsuleBuildError";
	}
};
var CreatorCapsuleBuilderV1 = class {
	configuration;
	broker;
	secretFactory;
	randomUUID;
	now;
	constructor(configuration, broker, secretFactory = new CreatorPayloadSecretsFactory(), randomUUID = () => crypto.randomUUID(), now = () => /* @__PURE__ */ new Date()) {
		this.configuration = configuration;
		this.broker = broker;
		this.secretFactory = secretFactory;
		this.randomUUID = randomUUID;
		this.now = now;
		validateIssuer(configuration.ctxIssuer);
		validateIssuer(configuration.automationRiskIssuer);
	}
	async build(input) {
		if (input.signingKey.status !== "active" || input.signingKey.recoveryStatus !== "confirmed") throw new CreatorCapsuleBuildError("recovery_required");
		const plaintext = await readSource(input.source, input.metadata);
		const secrets = this.secretFactory.create();
		let registration;
		try {
			const capsuleId = `urn:uuid:${this.randomUUID()}`;
			const capsuleRevision = 1;
			const payloadId = "primary";
			const path = payloadPath(payloadId);
			const policy = buildStage("policy_build_failed", () => buildCtxPolicyV1(input.draft, this.configuration.automationRiskIssuer));
			const policySha256 = await buildAsyncStage("policy_build_failed", () => ctxPolicySha256(policy));
			const nonce = secrets.nonceBytes();
			const context = Object.freeze({
				type: "ctx-capsule-payload-aad",
				version: "1.0",
				cryptographic_suite: CAPSULE_SUITE_ID,
				capsule: Object.freeze({
					id: capsuleId,
					revision: capsuleRevision
				}),
				content_profile: Object.freeze({
					id: STATIC_IMAGE_PROFILE_ID,
					version: "1.0"
				}),
				payload: Object.freeze({
					id: payloadId,
					path,
					media_type: input.metadata.mediaType,
					plaintext_size: plaintext.byteLength
				})
			});
			const encrypted = await buildAsyncStage("payload_encryption_failed", () => secrets.withContentKey((contentKey) => encryptPayloadV1(plaintext, contentKey, nonce, context)));
			try {
				registration = await this.broker.register({
					registrationId: createBrokerRegistrationId(this.randomUUID),
					capsuleId,
					capsuleRevision,
					payloadId,
					policySha256,
					policy,
					title: input.draft.description.title,
					contentProfileId: STATIC_IMAGE_PROFILE_ID,
					contentProfileVersion: "1.0",
					mediaType: input.metadata.mediaType
				}, secrets, input.token, input.device);
			} catch (error) {
				throw new CreatorCapsuleBuildError("broker_registration_failed", brokerRegistrationFailureDetail(error));
			}
			const brokerRegistration = registration;
			const manifest = await buildAsyncStage("manifest_validation_failed", async () => parseCapsuleManifest({
				type: "capsule-manifest",
				format_version: "1.0",
				capsule: {
					id: capsuleId,
					revision: capsuleRevision,
					created_at: canonicalInstant$1(this.now())
				},
				cryptographic_suite: CAPSULE_SUITE_ID,
				creator: { signing_key: {
					id: input.signingKey.id,
					algorithm: input.signingKey.algorithm,
					public_key: input.signingKey.publicKey
				} },
				content_profile: {
					id: STATIC_IMAGE_PROFILE_ID,
					version: "1.0"
				},
				description: {
					title: input.draft.description.title,
					...input.draft.description.description === void 0 ? {} : { description: input.draft.description.description }
				},
				policy,
				ctx: { issuer: this.configuration.ctxIssuer },
				payloads: [{
					id: payloadId,
					path,
					media_type: input.metadata.mediaType,
					plaintext_size: plaintext.byteLength,
					ciphertext_size: encrypted.ciphertext.byteLength,
					ciphertext_sha256: await sha256Base64Url(encrypted.ciphertext),
					encryption: {
						representation: "whole",
						nonce: encodeBase64Url$1(nonce)
					},
					key_release: {
						broker: brokerRegistration.broker,
						handle: brokerRegistration.releaseHandle
					},
					profile_metadata: {
						width: input.metadata.width,
						height: input.metadata.height,
						pixel_count: input.metadata.pixelCount
					}
				}]
			}));
			const publicKey = await buildAsyncStage("manifest_signing_failed", () => importEd25519PublicKey(decodeBase64Url(input.signingKey.publicKey)));
			const signature = await buildAsyncStage("manifest_signing_failed", () => signCapsuleManifest(manifest, {
				privateKey: input.signingKey.privateKey,
				publicKey
			}));
			const archive = await buildAsyncStage("archive_assembly_failed", () => assembleCapsuleZipV1(manifest, signature, encrypted.ciphertext));
			const verified = await buildAsyncStage("archive_verification_failed", () => verifyCapsuleZipV1(archive));
			if (verified.manifest.capsule.id !== manifest.capsule.id || verified.manifest.capsule.revision !== manifest.capsule.revision) throw new CreatorCapsuleBuildError("build_failed", "verified_manifest_mismatch");
			try {
				await this.broker.finalize(registration, input.token, input.device);
			} catch (error) {
				throw new CreatorCapsuleBuildError("broker_registration_failed", brokerRegistrationFailureDetail(error));
			}
			return Object.freeze({
				manifest,
				manifestSignature: signature,
				encryptedPayload: encrypted.ciphertext,
				archive,
				registration
			});
		} catch (error) {
			if (registration !== void 0) try {
				await this.broker.cancel(registration, input.token, input.device);
			} catch {}
			if (error instanceof CreatorCapsuleBuildError) throw error;
			throw new CreatorCapsuleBuildError("build_failed");
		} finally {
			plaintext.fill(0);
			secrets.destroy();
		}
	}
};
function brokerRegistrationFailureDetail(error) {
	if (error instanceof CreatorBrokerRegistrationError) return error.code;
}
function buildStage(detail, callback) {
	try {
		return callback();
	} catch (error) {
		if (error instanceof CreatorCapsuleBuildError) throw error;
		throw new CreatorCapsuleBuildError("build_failed", detail);
	}
}
async function buildAsyncStage(detail, callback) {
	try {
		return await callback();
	} catch (error) {
		if (error instanceof CreatorCapsuleBuildError) throw error;
		throw new CreatorCapsuleBuildError("build_failed", detail);
	}
}
function buildCtxPolicyV1(draft, automationRiskIssuer) {
	const requirements = [
		{
			predicate: EMAIL_VERIFIED_PREDICATE,
			equals: true
		},
		{
			predicate: ACCOUNT_ACTIVE_PREDICATE,
			equals: true
		},
		{
			predicate: DEVICE_REGISTERED_PREDICATE,
			equals: true
		},
		{
			predicate: VIEW_EVENT_CONSENT_PREDICATE,
			equals: true
		}
	];
	if (draft.policy.access_window !== void 0) requirements.push({
		predicate: CAPSULE_ACCESS_WINDOW_PREDICATE,
		...draft.policy.access_window
	});
	if (draft.policy.capsule_lifetime_maximum !== void 0) requirements.push({
		predicate: CAPSULE_LIFETIME_LIMIT_PREDICATE,
		scope: "capsule",
		maximum: draft.policy.capsule_lifetime_maximum
	});
	if (draft.policy.account_capsule_lifetime_maximum !== void 0) requirements.push({
		predicate: ACCOUNT_CAPSULE_LIFETIME_LIMIT_PREDICATE,
		scope: "account-and-capsule",
		maximum: draft.policy.account_capsule_lifetime_maximum
	});
	if (draft.policy.automation_risk_required) requirements.push({
		predicate: AUTOMATION_RISK_NOT_HIGH_PREDICATE,
		issuer: automationRiskIssuer
	});
	return parseCtxPolicyV1({
		type: CTX_POLICY_TYPE,
		version: 1,
		combiner: "all",
		requirements
	});
}
async function readSource(source, metadata) {
	if (source.size !== metadata.encodedBytes) throw new CreatorCapsuleBuildError("invalid_source");
	let bytes;
	try {
		bytes = await source.read();
	} catch {
		throw new CreatorCapsuleBuildError("invalid_source");
	}
	if (bytes.byteLength !== metadata.encodedBytes) {
		bytes.fill(0);
		throw new CreatorCapsuleBuildError("invalid_source");
	}
	return bytes;
}
function canonicalInstant$1(value) {
	if (!Number.isFinite(value.getTime())) throw new CreatorCapsuleBuildError("build_failed");
	return (/* @__PURE__ */ new Date(Math.floor(value.getTime() / 1e3) * 1e3)).toISOString().replace(".000Z", "Z");
}
function validateIssuer(value) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && !(url.protocol === "http:" && [
			"localhost",
			"127.0.0.1",
			"[::1]"
		].includes(url.hostname)) || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("invalid issuer");
	} catch {
		throw new CreatorCapsuleBuildError("invalid_configuration");
	}
}
//#endregion
//#region apps/browser-extension/src/creator-capsule-workflow.ts
var CreatorCapsuleWorkflowError = class extends Error {
	code;
	detail;
	constructor(code, detail) {
		super(code);
		this.code = code;
		this.detail = detail;
		this.name = "CreatorCapsuleWorkflowError";
	}
};
var CreatorCapsuleWorkflow = class {
	surface;
	keys;
	sessions;
	builder;
	cancellation;
	downloader;
	title;
	constructor(surface, keys, sessions, builder, cancellation, downloader, title) {
		this.surface = surface;
		this.keys = keys;
		this.sessions = sessions;
		this.builder = builder;
		this.cancellation = cancellation;
		this.downloader = downloader;
		this.title = title;
	}
	async buildAndDownload(filename = this.title) {
		const source = this.surface.selectedSource();
		const metadata = this.surface.selectedMetadata();
		if (source === void 0 || metadata === void 0) throw new CreatorCapsuleWorkflowError("file_required");
		let signingKey;
		try {
			signingKey = await this.keys.publicationSigningKey();
		} catch {
			throw new CreatorCapsuleWorkflowError("signing_key_required");
		}
		const session = await this.sessions.active();
		if (session === void 0) throw new CreatorCapsuleWorkflowError("session_required");
		let built;
		try {
			built = await this.builder.build({
				draft: this.surface.draftValue(),
				source,
				metadata,
				signingKey,
				token: session.token,
				device: session.device
			});
		} catch (error) {
			throw new CreatorCapsuleWorkflowError("build_failed", error instanceof CreatorCapsuleBuildError ? error.detail ?? error.code : void 0);
		}
		try {
			await this.downloader.download(signingKey.id, capsuleFilename(filename), built.archive);
		} catch {
			try {
				await this.cancellation.cancel(built.registration, session.token, session.device);
			} catch {}
			throw new CreatorCapsuleWorkflowError("download_failed");
		}
		return built;
	}
};
function capsuleFilename(name) {
	const slug = name.replace(/\.capsule$/iu, "").normalize("NFKD").replaceAll(/[^A-Za-z0-9]+/gu, "-").replaceAll(/^-|-$/gu, "").toLowerCase().slice(0, 80);
	return `${slug === "" ? "share-capsule" : slug}.capsule`;
}
//#endregion
//#region apps/browser-extension/src/creator-studio.ts
var CreatorStudioDraftError = class extends Error {
	constructor() {
		super("The Creator Studio draft is invalid.");
		this.name = "CreatorStudioDraftError";
	}
};
var CreatorStudioSurface = class {
	draft;
	picker;
	renderer;
	inspector;
	source;
	metadata;
	sourceIssue;
	choosing = false;
	constructor(draft, picker, renderer, inspector) {
		this.draft = draft;
		this.picker = picker;
		this.renderer = renderer;
		this.inspector = inspector;
	}
	start() {
		this.render("ready");
	}
	async chooseSource() {
		if (this.choosing) return;
		this.choosing = true;
		this.render("choosing-file");
		try {
			const selected = await this.picker.choose();
			if (selected !== void 0) {
				this.source = void 0;
				this.metadata = void 0;
				this.sourceIssue = void 0;
				if (this.inspector === void 0) this.source = selected;
				else {
					this.render("validating-file");
					try {
						const inspection = await this.inspector.inspect(selected);
						if (inspection.valid) {
							this.source = selected;
							this.metadata = inspection.metadata;
						} else this.sourceIssue = inspection.issues[0]?.message ?? "The selected file is not supported.";
					} catch {
						this.sourceIssue = "The selected file could not be checked. Please choose it again.";
					}
				}
			}
		} finally {
			this.choosing = false;
			this.render(this.source !== void 0 ? "file-selected" : this.sourceIssue === void 0 ? "ready" : "file-invalid");
		}
	}
	selectedSource() {
		return this.source;
	}
	selectedMetadata() {
		return this.metadata;
	}
	draftValue() {
		return this.draft;
	}
	render(status) {
		this.renderer.render({
			status,
			title: this.draft.description.title,
			...this.draft.description.description === void 0 ? {} : { description: this.draft.description.description },
			accessSummary: accessSummary(this.draft.policy.access_window),
			totalLimitSummary: this.draft.policy.capsule_lifetime_maximum === void 0 ? "No total opening limit" : `${this.draft.policy.capsule_lifetime_maximum} total openings`,
			accountLimitSummary: this.draft.policy.account_capsule_lifetime_maximum === void 0 ? "No per-account opening limit" : `${this.draft.policy.account_capsule_lifetime_maximum} openings per user account`,
			automationRiskSummary: this.draft.policy.automation_risk_required ? "Automation protection on" : "Automation protection off",
			...this.sourceIssue === void 0 ? {} : { sourceIssue: this.sourceIssue },
			...this.source === void 0 ? {} : { selectedFile: {
				name: this.source.name,
				size: this.source.size,
				mediaType: this.source.mediaType
			} }
		});
	}
};
function parseCreatorStudioDraftV1(value) {
	const root = record(typeof value === "string" ? parseJson$1(value) : value, [
		"description",
		"fallback",
		"policy",
		"version"
	]);
	if (root.version !== 1) throw new CreatorStudioDraftError();
	const description = record(root.description, ["description", "title"], ["description"]);
	const title = boundedText(description.title, 1, 200);
	const detail = description.description === void 0 ? void 0 : boundedText(description.description, 1, 1e3);
	const altText = boundedText(record(root.fallback, ["alt_text"]).alt_text, 1, 1e3);
	if (altText !== (detail ?? title)) throw new CreatorStudioDraftError();
	const policy = record(root.policy, [
		"access_window",
		"account_capsule_lifetime_maximum",
		"automation_risk_required",
		"capsule_lifetime_maximum"
	], [
		"access_window",
		"account_capsule_lifetime_maximum",
		"capsule_lifetime_maximum"
	]);
	if (typeof policy.automation_risk_required !== "boolean") throw new CreatorStudioDraftError();
	const total = optionalLimit(policy.capsule_lifetime_maximum);
	const account = optionalLimit(policy.account_capsule_lifetime_maximum);
	if (total !== void 0 && account !== void 0 && total < account) throw new CreatorStudioDraftError();
	const window = optionalAccessWindow(policy.access_window);
	return Object.freeze({
		version: 1,
		description: Object.freeze({
			title,
			...detail === void 0 ? {} : { description: detail }
		}),
		fallback: Object.freeze({ alt_text: altText }),
		policy: Object.freeze({
			...window === void 0 ? {} : { access_window: window },
			...total === void 0 ? {} : { capsule_lifetime_maximum: total },
			...account === void 0 ? {} : { account_capsule_lifetime_maximum: account },
			automation_risk_required: policy.automation_risk_required
		})
	});
}
function optionalAccessWindow(value) {
	if (value === void 0) return void 0;
	const window = record(value, ["not_after", "not_before"], ["not_after", "not_before"]);
	if (window.not_before === void 0 && window.not_after === void 0) throw new CreatorStudioDraftError();
	const notBefore = optionalInstant(window.not_before);
	const notAfter = optionalInstant(window.not_after);
	if (notBefore !== void 0 && notAfter !== void 0 && Date.parse(notBefore) >= Date.parse(notAfter)) throw new CreatorStudioDraftError();
	return Object.freeze({
		...notBefore === void 0 ? {} : { not_before: notBefore },
		...notAfter === void 0 ? {} : { not_after: notAfter }
	});
}
function accessSummary(window) {
	if (window === void 0) return "Can be opened at any time";
	if (window.not_before !== void 0 && window.not_after !== void 0) return `Can be opened from ${localDate(window.not_before)} through ${localClosingDate(window.not_after)}`;
	if (window.not_before !== void 0) return `Can be opened starting ${localDate(window.not_before)}`;
	if (window.not_after !== void 0) return `Can be opened through ${localClosingDate(window.not_after)}`;
	throw new CreatorStudioDraftError();
}
function localDate(value) {
	return new Intl.DateTimeFormat(void 0, { dateStyle: "medium" }).format(new Date(value));
}
function localClosingDate(value) {
	const instant = new Date(value);
	instant.setMilliseconds(instant.getMilliseconds() - 1);
	return localDate(instant.toISOString());
}
function parseJson$1(value) {
	try {
		return JSON.parse(value);
	} catch {
		throw new CreatorStudioDraftError();
	}
}
function record(value, allowed, optional = []) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new CreatorStudioDraftError();
	const result = value;
	const keys = Object.keys(result).sort();
	const allowedSet = new Set(allowed);
	if (keys.some((key) => !allowedSet.has(key))) throw new CreatorStudioDraftError();
	for (const key of allowed) if (!optional.includes(key) && !(key in result)) throw new CreatorStudioDraftError();
	return result;
}
function boundedText(value, minimum, maximum) {
	if (typeof value !== "string" || value.length < minimum || value.length > maximum || value.trim() !== value) throw new CreatorStudioDraftError();
	return value;
}
function optionalLimit(value) {
	if (value === void 0) return void 0;
	if (!Number.isSafeInteger(value) || value < 1) throw new CreatorStudioDraftError();
	return value;
}
function optionalInstant(value) {
	if (value === void 0) return void 0;
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) throw new CreatorStudioDraftError();
	const milliseconds = Date.parse(value);
	if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString().replace(".000Z", "Z") !== value) throw new CreatorStudioDraftError();
	return value;
}
//#endregion
//#region apps/browser-extension/src/creator-signing-key.ts
var CREATOR_SIGNING_ALGORITHM = "Ed25519";
var CreatorSigningKeyError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CreatorSigningKeyError";
	}
};
var CreatorSigningKeyRing = class {
	store;
	cryptography;
	clock;
	constructor(store, cryptography = crypto, clock = { now: () => /* @__PURE__ */ new Date() }) {
		this.store = store;
		this.cryptography = cryptography;
		this.clock = clock;
	}
	async generate() {
		let pair;
		let publicKey;
		try {
			const generated = await this.cryptography.subtle.generateKey({ name: CREATOR_SIGNING_ALGORITHM }, true, ["sign", "verify"]);
			if (!isKeyPair$1(generated)) throw new CreatorSigningKeyError("generation_failed");
			const publicBytes = new Uint8Array(await this.cryptography.subtle.exportKey("raw", generated.publicKey));
			if (publicBytes.byteLength !== 32) throw new CreatorSigningKeyError("generation_failed");
			pair = generated;
			publicKey = encodeBase64Url$1(publicBytes);
		} catch (error) {
			if (error instanceof CreatorSigningKeyError) throw error;
			throw new CreatorSigningKeyError("generation_failed");
		}
		let id;
		let now;
		try {
			id = `creator_${this.cryptography.randomUUID().replaceAll("-", "")}`;
			now = canonicalInstant(this.clock.now());
		} catch {
			throw new CreatorSigningKeyError("generation_failed");
		}
		const record = Object.freeze({
			id,
			algorithm: CREATOR_SIGNING_ALGORITHM,
			publicKey,
			privateKey: pair.privateKey,
			status: "active",
			createdAt: now,
			statusChangedAt: now,
			recoveryStatus: "required"
		});
		try {
			await this.store.addAsActive(record);
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
		return summary(record);
	}
	async list() {
		try {
			const records = await this.store.list();
			return Object.freeze([...records].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)).map(summary));
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
	}
	async activeSigningKey() {
		let records;
		try {
			records = await this.store.list();
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
		const active = records.filter((record) => record.status === "active");
		const selected = active[0];
		if (active.length !== 1 || selected === void 0) throw new CreatorSigningKeyError("no_active_key");
		return selected;
	}
	async publicationSigningKey() {
		const active = await this.activeSigningKey();
		if (active.recoveryStatus !== "confirmed") throw new CreatorSigningKeyError("recovery_required");
		return active;
	}
	async confirmRecoverySaved(id) {
		let confirmed;
		try {
			confirmed = await this.store.confirmRecovery(id, canonicalInstant(this.clock.now()));
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
		if (confirmed === void 0) {
			const record = (await this.list()).find((key) => key.id === id);
			if (record === void 0) throw new CreatorSigningKeyError("key_not_found");
			if (record.status === "active" && record.recoveryStatus === "confirmed") return record;
			throw new CreatorSigningKeyError("invalid_transition");
		}
		return summary(confirmed);
	}
	async restore(recovered) {
		const now = canonicalInstant(this.clock.now());
		const record = Object.freeze({
			...recovered,
			status: "active",
			statusChangedAt: now,
			recoveryStatus: "confirmed",
			recoveryConfirmedAt: now
		});
		if (storedRecord(record) === void 0) throw new CreatorSigningKeyError("generation_failed");
		try {
			await this.store.addAsActive(record);
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
		return summary(record);
	}
	revoke(id) {
		return this.changeStatus(id, ["active", "retiring"], "revoked");
	}
	expire(id) {
		return this.changeStatus(id, ["retiring"], "expired");
	}
	async changeStatus(id, allowedCurrentStatuses, status) {
		let changed;
		try {
			changed = await this.store.transition(id, allowedCurrentStatuses, status, canonicalInstant(this.clock.now()));
		} catch {
			throw new CreatorSigningKeyError("storage_failed");
		}
		if (changed === void 0) throw new CreatorSigningKeyError((await this.list()).some((record) => record.id === id) ? "invalid_transition" : "key_not_found");
		return summary(changed);
	}
};
var IndexedDbCreatorSigningKeyStore = class {
	databaseName;
	storeName;
	constructor(databaseName = "share-capsules-creator", storeName = "creator-signing-keys") {
		this.databaseName = databaseName;
		this.storeName = storeName;
	}
	async addAsActive(record) {
		const database = await this.open();
		try {
			await new Promise((resolve, reject) => {
				const transaction = database.transaction(this.storeName, "readwrite");
				const store = transaction.objectStore(this.storeName);
				const request = store.getAll();
				request.onsuccess = () => {
					for (const existing of storedRecords(request.result)) {
						if (existing.status !== "active") continue;
						store.put({
							...existing,
							status: "retiring",
							statusChangedAt: record.statusChangedAt
						});
					}
					store.add(record);
				};
				request.onerror = () => transaction.abort();
				transaction.oncomplete = () => resolve();
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			});
		} finally {
			database.close();
		}
	}
	async list() {
		const database = await this.open();
		try {
			return await new Promise((resolve, reject) => {
				const request = database.transaction(this.storeName, "readonly").objectStore(this.storeName).getAll();
				request.onsuccess = () => resolve(storedRecords(request.result));
				request.onerror = () => reject(request.error);
			});
		} finally {
			database.close();
		}
	}
	async transition(id, allowedCurrentStatuses, status, changedAt) {
		const database = await this.open();
		try {
			return await new Promise((resolve, reject) => {
				const transaction = database.transaction(this.storeName, "readwrite");
				const store = transaction.objectStore(this.storeName);
				const request = store.get(id);
				let changed;
				request.onsuccess = () => {
					const current = storedRecord(request.result);
					if (current === void 0 || !allowedCurrentStatuses.includes(current.status)) return;
					changed = {
						...current,
						status,
						statusChangedAt: changedAt
					};
					store.put(changed);
				};
				request.onerror = () => transaction.abort();
				transaction.oncomplete = () => resolve(changed);
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			});
		} finally {
			database.close();
		}
	}
	async confirmRecovery(id, confirmedAt) {
		const database = await this.open();
		try {
			return await new Promise((resolve, reject) => {
				const transaction = database.transaction(this.storeName, "readwrite");
				const store = transaction.objectStore(this.storeName);
				const request = store.get(id);
				let confirmed;
				request.onsuccess = () => {
					const current = storedRecord(request.result);
					if (current === void 0 || current.status !== "active" || current.recoveryStatus !== "required") return;
					confirmed = {
						...current,
						recoveryStatus: "confirmed",
						recoveryConfirmedAt: confirmedAt
					};
					store.put(confirmed);
				};
				request.onerror = () => transaction.abort();
				transaction.oncomplete = () => resolve(confirmed);
				transaction.onerror = () => reject(transaction.error);
				transaction.onabort = () => reject(transaction.error);
			});
		} finally {
			database.close();
		}
	}
	async open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.databaseName, 1);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(this.storeName)) database.createObjectStore(this.storeName, { keyPath: "id" });
			};
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
};
function summary(record) {
	return Object.freeze({
		id: record.id,
		algorithm: record.algorithm,
		publicKey: record.publicKey,
		status: record.status,
		createdAt: record.createdAt,
		statusChangedAt: record.statusChangedAt,
		recoveryStatus: record.recoveryStatus,
		...record.recoveryConfirmedAt === void 0 ? {} : { recoveryConfirmedAt: record.recoveryConfirmedAt }
	});
}
function canonicalInstant(value) {
	if (!Number.isFinite(value.getTime())) throw new CreatorSigningKeyError("generation_failed");
	return value.toISOString();
}
function isKeyPair$1(value) {
	return "privateKey" in value && "publicKey" in value;
}
function storedRecords(value) {
	if (!Array.isArray(value)) throw new CreatorSigningKeyError("storage_failed");
	const records = [];
	for (const valueRecord of value) {
		const record = storedRecord(valueRecord);
		if (record === void 0) throw new CreatorSigningKeyError("storage_failed");
		records.push(record);
	}
	return records;
}
function storedRecord(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const candidate = value;
	if (typeof candidate.id !== "string" || !/^creator_[a-f0-9]{32}$/u.test(candidate.id) || candidate.algorithm !== "Ed25519" || typeof candidate.publicKey !== "string" || !isPublicKey(candidate.publicKey) || !(candidate.privateKey instanceof CryptoKey) || candidate.privateKey.type !== "private" || candidate.privateKey.algorithm.name !== "Ed25519" || candidate.privateKey.usages.length !== 1 || candidate.privateKey.usages[0] !== "sign" || !isStatus(candidate.status) || !isRecoveryStatus(candidate.recoveryStatus) || typeof candidate.createdAt !== "string" || !isCanonicalInstant$1(candidate.createdAt) || typeof candidate.statusChangedAt !== "string" || !isCanonicalInstant$1(candidate.statusChangedAt) || candidate.statusChangedAt < candidate.createdAt || candidate.recoveryStatus === "required" && candidate.recoveryConfirmedAt !== void 0 || candidate.recoveryStatus === "confirmed" && (typeof candidate.recoveryConfirmedAt !== "string" || !isCanonicalInstant$1(candidate.recoveryConfirmedAt) || candidate.recoveryConfirmedAt < candidate.createdAt)) return;
	return candidate;
}
function isStatus(value) {
	return value === "active" || value === "retiring" || value === "revoked" || value === "expired";
}
function isRecoveryStatus(value) {
	return value === "required" || value === "confirmed";
}
function isPublicKey(value) {
	try {
		return decodeBase64Url(value).byteLength === 32;
	} catch {
		return false;
	}
}
function isCanonicalInstant$1(value) {
	const milliseconds = Date.parse(value);
	return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}
//#endregion
//#region apps/browser-extension/src/creator-signing-key-recovery.ts
var CREATOR_RECOVERY_BUNDLE_TYPE = "share-capsules-creator-key-recovery";
var CREATOR_RECOVERY_KDF = "HKDF-SHA-256";
var CREATOR_RECOVERY_ENCRYPTION = "AES-256-GCM";
var CREATOR_RECOVERY_MAX_SERIALIZED_BUNDLE_BYTES = 16384;
var RECOVERY_KEY_INFO = new TextEncoder().encode("share-capsules-creator-signing-key-recovery-v1");
var KEY_MATCH_CHALLENGE = new TextEncoder().encode("share-capsules-creator-signing-key-recovery-match-v1");
var CreatorSigningKeyRecoveryError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CreatorSigningKeyRecoveryError";
	}
};
var CreatorSigningKeyRecoveryService = class {
	subtle;
	randomness;
	constructor(subtle = crypto.subtle, randomness = { bytes: (length) => crypto.getRandomValues(new Uint8Array(length)) }) {
		this.subtle = subtle;
		this.randomness = randomness;
	}
	async create(key) {
		let recoveryCodeBytes;
		let plaintext;
		try {
			if (key.status !== "active") throw new CreatorSigningKeyRecoveryError("creation_failed");
			recoveryCodeBytes = this.randomBytes(32);
			const salt = this.randomBytes(16);
			const nonce = this.randomBytes(12);
			const recoveryCode = encodeBase64Url$1(recoveryCodeBytes);
			const privateKey = new Uint8Array(await this.subtle.exportKey("pkcs8", key.privateKey));
			try {
				plaintext = canonicalizeJsonBytes({
					type: "share-capsules-creator-signing-key",
					version: 1,
					key_id: key.id,
					algorithm: key.algorithm,
					public_key: key.publicKey,
					private_key_pkcs8: encodeBase64Url$1(privateKey),
					created_at: key.createdAt
				});
			} finally {
				privateKey.fill(0);
			}
			const header = recoveryHeader(key, salt, nonce);
			const encryptionKey = await this.deriveEncryptionKey(recoveryCodeBytes, salt, ["encrypt"]);
			const ciphertext = new Uint8Array(await this.subtle.encrypt({
				name: "AES-GCM",
				iv: toArrayBuffer$2(nonce),
				additionalData: toArrayBuffer$2(canonicalizeJsonBytes(header)),
				tagLength: 128
			}, encryptionKey, toArrayBuffer$2(plaintext)));
			return Object.freeze({
				recoveryCode,
				bundle: Object.freeze({
					...header,
					ciphertext: encodeBase64Url$1(ciphertext)
				})
			});
		} catch (error) {
			if (error instanceof CreatorSigningKeyRecoveryError) throw error;
			throw new CreatorSigningKeyRecoveryError("creation_failed");
		} finally {
			recoveryCodeBytes?.fill(0);
			plaintext?.fill(0);
		}
	}
	async recover(bundleInput, recoveryCode) {
		const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
		const code = parseRecoveryCode(recoveryCode);
		let plaintextBytes;
		let privateBytes;
		try {
			const salt = decodeBase64Url(bundle.kdf.salt);
			const nonce = decodeBase64Url(bundle.encryption.nonce);
			const encryptionKey = await this.deriveEncryptionKey(code, salt, ["decrypt"]);
			plaintextBytes = new Uint8Array(await this.subtle.decrypt({
				name: "AES-GCM",
				iv: toArrayBuffer$2(nonce),
				additionalData: toArrayBuffer$2(canonicalizeJsonBytes(recoveryHeaderFromBundle(bundle))),
				tagLength: 128
			}, encryptionKey, toArrayBuffer$2(decodeBase64Url(bundle.ciphertext))));
			const plaintext = parseRecoveryPlaintext(plaintextBytes);
			if (plaintext.key_id !== bundle.key.id || plaintext.algorithm !== bundle.key.algorithm || plaintext.public_key !== bundle.key.public_key || plaintext.created_at !== bundle.key.created_at) throw new CreatorSigningKeyRecoveryError("recovery_failed");
			privateBytes = decodeBase64Url(plaintext.private_key_pkcs8);
			const privateKey = await this.subtle.importKey("pkcs8", toArrayBuffer$2(privateBytes), { name: CREATOR_SIGNING_ALGORITHM }, true, ["sign"]);
			await this.assertKeyMatch(privateKey, bundle.key.public_key);
			return Object.freeze({
				id: bundle.key.id,
				algorithm: CREATOR_SIGNING_ALGORITHM,
				publicKey: bundle.key.public_key,
				privateKey,
				createdAt: bundle.key.created_at
			});
		} catch (error) {
			if (error instanceof CreatorSigningKeyRecoveryError) throw error;
			throw new CreatorSigningKeyRecoveryError("recovery_failed");
		} finally {
			code.fill(0);
			plaintextBytes?.fill(0);
			privateBytes?.fill(0);
		}
	}
	randomBytes(length) {
		const value = this.randomness.bytes(length);
		if (value.byteLength !== length) throw new CreatorSigningKeyRecoveryError("creation_failed");
		return value;
	}
	async deriveEncryptionKey(recoveryCode, salt, usages) {
		const material = await this.subtle.importKey("raw", toArrayBuffer$2(recoveryCode), "HKDF", false, ["deriveKey"]);
		return this.subtle.deriveKey({
			name: "HKDF",
			hash: "SHA-256",
			salt: toArrayBuffer$2(salt),
			info: toArrayBuffer$2(RECOVERY_KEY_INFO)
		}, material, {
			name: "AES-GCM",
			length: 256
		}, false, [...usages]);
	}
	async assertKeyMatch(privateKey, publicKey) {
		const verificationKey = await this.subtle.importKey("raw", toArrayBuffer$2(decodeBase64Url(publicKey)), { name: CREATOR_SIGNING_ALGORITHM }, false, ["verify"]);
		const signature = await this.subtle.sign(CREATOR_SIGNING_ALGORITHM, privateKey, KEY_MATCH_CHALLENGE);
		if (!await this.subtle.verify("Ed25519", verificationKey, signature, KEY_MATCH_CHALLENGE)) throw new CreatorSigningKeyRecoveryError("recovery_failed");
	}
};
function recoveryHeader(key, salt, nonce) {
	return Object.freeze({
		type: CREATOR_RECOVERY_BUNDLE_TYPE,
		version: 1,
		key: Object.freeze({
			id: key.id,
			algorithm: CREATOR_SIGNING_ALGORITHM,
			public_key: key.publicKey,
			created_at: key.createdAt
		}),
		kdf: Object.freeze({
			algorithm: CREATOR_RECOVERY_KDF,
			salt: encodeBase64Url$1(salt)
		}),
		encryption: Object.freeze({
			algorithm: CREATOR_RECOVERY_ENCRYPTION,
			nonce: encodeBase64Url$1(nonce)
		})
	});
}
function recoveryHeaderFromBundle(bundle) {
	return {
		type: bundle.type,
		version: bundle.version,
		key: bundle.key,
		kdf: bundle.kdf,
		encryption: bundle.encryption
	};
}
function parseCreatorSigningKeyRecoveryBundle(value) {
	if (typeof value === "string" && new TextEncoder().encode(value).byteLength > CREATOR_RECOVERY_MAX_SERIALIZED_BUNDLE_BYTES) throw new CreatorSigningKeyRecoveryError("invalid_bundle");
	const root = exactRecord(typeof value === "string" ? parseJson(value) : value, [
		"ciphertext",
		"encryption",
		"kdf",
		"key",
		"type",
		"version"
	]);
	const key = exactRecord(root.key, [
		"algorithm",
		"created_at",
		"id",
		"public_key"
	]);
	const kdf = exactRecord(root.kdf, ["algorithm", "salt"]);
	const encryption = exactRecord(root.encryption, ["algorithm", "nonce"]);
	if (root.type !== "share-capsules-creator-key-recovery" || root.version !== 1 || key.algorithm !== "Ed25519" || typeof key.id !== "string" || !/^creator_[a-f0-9]{32}$/u.test(key.id) || typeof key.public_key !== "string" || !encodedLength(key.public_key, 32) || typeof key.created_at !== "string" || !isCanonicalInstant(key.created_at) || kdf.algorithm !== "HKDF-SHA-256" || typeof kdf.salt !== "string" || !encodedLength(kdf.salt, 16) || encryption.algorithm !== "AES-256-GCM" || typeof encryption.nonce !== "string" || !encodedLength(encryption.nonce, 12) || typeof root.ciphertext !== "string" || !encodedLengthBetween(root.ciphertext, 17, 4096)) throw new CreatorSigningKeyRecoveryError("invalid_bundle");
	return root;
}
function parseRecoveryPlaintext(value) {
	let parsed;
	try {
		parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(value));
	} catch {
		throw new CreatorSigningKeyRecoveryError("recovery_failed");
	}
	const root = exactRecord(parsed, [
		"algorithm",
		"created_at",
		"key_id",
		"private_key_pkcs8",
		"public_key",
		"type",
		"version"
	], "recovery_failed");
	if (root.type !== "share-capsules-creator-signing-key" || root.version !== 1 || root.algorithm !== "Ed25519" || typeof root.key_id !== "string" || typeof root.public_key !== "string" || typeof root.private_key_pkcs8 !== "string" || !encodedLengthBetween(root.private_key_pkcs8, 32, 512) || typeof root.created_at !== "string") throw new CreatorSigningKeyRecoveryError("recovery_failed");
	return root;
}
function parseRecoveryCode(value) {
	if (!encodedLength(value, 32)) throw new CreatorSigningKeyRecoveryError("invalid_recovery_code");
	return decodeBase64Url(value);
}
function exactRecord(value, keys, errorCode = "invalid_bundle") {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new CreatorSigningKeyRecoveryError(errorCode);
	const record = value;
	const actual = Object.keys(record).sort();
	if (actual.length !== keys.length || actual.some((key, index) => key !== [...keys].sort()[index])) throw new CreatorSigningKeyRecoveryError(errorCode);
	return record;
}
function parseJson(value) {
	try {
		return JSON.parse(value);
	} catch {
		throw new CreatorSigningKeyRecoveryError("invalid_bundle");
	}
}
function encodedLength(value, length) {
	try {
		return decodeBase64Url(value).byteLength === length;
	} catch {
		return false;
	}
}
function encodedLengthBetween(value, minimum, maximum) {
	try {
		const length = decodeBase64Url(value).byteLength;
		return length >= minimum && length <= maximum;
	} catch {
		return false;
	}
}
function isCanonicalInstant(value) {
	const milliseconds = Date.parse(value);
	return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === value;
}
function toArrayBuffer$2(value) {
	return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
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
//#region apps/browser-extension/src/creator-content-profiles.ts
var STATIC_IMAGE_CREATOR_PROFILE_V1 = Object.freeze(new StaticImageCreatorProfileV1());
var TRUSTED_CREATOR_CONTENT_PROFILES = Object.freeze([STATIC_IMAGE_CREATOR_PROFILE_V1]);
var CREATOR_CONTENT_PROFILE_REGISTRY = Object.freeze(new ContentProfileRegistry(TRUSTED_CREATOR_CONTENT_PROFILES));
//#endregion
//#region apps/browser-extension/src/creator-host-integration.ts
var CreatorHostIntegrationError = class extends Error {
	field;
	constructor(field) {
		super(`The ${field} value is invalid.`);
		this.field = field;
		this.name = "CreatorHostIntegrationError";
	}
};
function createCreatorHostIntegrationV1(input) {
	const capsuleUrl = validateCapsuleUrl(input.capsuleUrl);
	const fallbackText = validateFallbackText(input.fallbackText);
	const markup = `<capsule-viewer src="${escapeAttribute(capsuleUrl)}">
  <p>${escapeText(fallbackText)}</p>
</capsule-viewer>`;
	return Object.freeze({
		version: 1,
		capsuleUrl,
		fallbackText,
		markup
	});
}
function exampleCapsuleUrlForFilename(filename) {
	if (!/^[a-z0-9](?:[a-z0-9-]{0,79})\.capsule$/u.test(filename)) throw new CreatorHostIntegrationError("capsule_url");
	return `https://example.com/capsules/${filename}`;
}
function validateCapsuleUrl(value) {
	if (value.trim() !== value || value.length > 2048) throw new CreatorHostIntegrationError("capsule_url");
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "") throw new Error("unsafe URL");
		return url.href;
	} catch {
		throw new CreatorHostIntegrationError("capsule_url");
	}
}
function validateFallbackText(value) {
	if (value.length < 1 || value.length > 1e3 || value.trim() !== value || hasForbiddenControl(value)) throw new CreatorHostIntegrationError("fallback_text");
	return value;
}
function hasForbiddenControl(value) {
	return [...value].some((character) => {
		const point = character.codePointAt(0);
		return point >= 0 && point <= 8 || point === 11 || point === 12 || point >= 14 && point <= 31 || point === 127;
	});
}
function escapeAttribute(value) {
	return value.replaceAll("&", "&amp;").replaceAll("\"", "&quot;");
}
function escapeText(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
//#endregion
//#region apps/browser-extension/src/creator-workspace.ts
var CREATOR_WORKSPACE_ROOT = "share-capsules";
var CreatorWorkspaceError = class extends Error {
	code;
	constructor(code) {
		super(code);
		this.code = code;
		this.name = "CreatorWorkspaceError";
	}
};
var CreatorWorkspaceRecoveryStore = class {
	storage;
	constructor(storage) {
		this.storage = storage;
	}
	async save(bundleInput) {
		const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
		await this.storage.set({ [recoveryStorageKey(bundle.key.id)]: bundle });
		return bundle;
	}
	async load(keyId) {
		assertCreatorKeyId(keyId);
		const value = (await this.storage.get([recoveryStorageKey(keyId)]))[recoveryStorageKey(keyId)];
		if (value === void 0) return void 0;
		const bundle = parseCreatorSigningKeyRecoveryBundle(value);
		if (bundle.key.id !== keyId) throw new Error("Workspace recovery key does not match.");
		return bundle;
	}
	async has(keyId) {
		return await this.load(keyId) !== void 0;
	}
};
var IndexedDbCreatorWorkspaceSelectionStore = class {
	databaseName;
	storeName;
	constructor(databaseName = "share-capsules-workspaces", storeName = "workspace-selections") {
		this.databaseName = databaseName;
		this.storeName = storeName;
	}
	async load(keyId) {
		assertCreatorKeyId(keyId);
		const database = await this.open();
		try {
			return storedSelection(await requestResult(database.transaction(this.storeName, "readonly").objectStore(this.storeName).get(keyId)));
		} finally {
			database.close();
		}
	}
	async save(selection) {
		const validated = storedSelection(selection);
		if (validated === void 0) throw new Error("Invalid Creator workspace selection.");
		const database = await this.open();
		try {
			const transaction = database.transaction(this.storeName, "readwrite");
			transaction.objectStore(this.storeName).put(validated);
			await transactionDone(transaction);
		} finally {
			database.close();
		}
	}
	open() {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(this.databaseName, 1);
			request.addEventListener("upgradeneeded", () => {
				if (!request.result.objectStoreNames.contains(this.storeName)) request.result.createObjectStore(this.storeName, { keyPath: "keyId" });
			});
			request.addEventListener("success", () => resolve(request.result), { once: true });
			request.addEventListener("error", () => reject(request.error), { once: true });
			request.addEventListener("blocked", () => reject(/* @__PURE__ */ new Error("Workspace store blocked.")), { once: true });
		});
	}
};
var FileSystemCreatorWorkspace = class {
	recovery;
	selections;
	constructor(recovery, selections) {
		this.recovery = recovery;
		this.selections = selections;
	}
	async status(keyId, preferredWorkspaceName) {
		const selection = await this.selections.load(keyId);
		if (selection === void 0) return void 0;
		if (preferredWorkspaceName !== void 0 && preferredWorkspaceName !== selection.workspaceName && await selection.parent.queryPermission({ mode: "readwrite" }) === "granted") return this.select(keyId, preferredWorkspaceName, selection.parent);
		return {
			keyId,
			workspaceName: selection.workspaceName,
			parentName: selection.parent.name,
			writable: await selection.parent.queryPermission({ mode: "readwrite" }) === "granted"
		};
	}
	async select(keyId, workspaceName, parent) {
		assertCreatorKeyId(keyId);
		assertWorkspaceName(workspaceName);
		if (!isDirectoryHandle(parent)) throw new Error("Invalid workspace parent directory.");
		if (await parent.queryPermission({ mode: "readwrite" }) !== "granted") throw new Error("The selected directory is not writable.");
		await this.selections.save({
			keyId,
			workspaceName,
			parent
		});
		await workspaceDirectory(parent, workspaceName);
		return {
			keyId,
			workspaceName,
			parentName: parent.name,
			writable: true
		};
	}
	async saveAndDownload(bundleInput) {
		const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
		await this.writeWorkspaceFiles(bundle);
		await this.recovery.save(bundle);
	}
	hasRecoveryBundle(keyId) {
		return this.restoreRecoveryBundleFromWorkspace(keyId);
	}
	async download(signingKeyId, filename, archive) {
		assertCapsuleFilename(filename);
		const bundle = await this.recovery.load(signingKeyId);
		if (bundle === void 0) throw new Error("Workspace recovery bundle is unavailable.");
		await writeFile(await uniqueFileHandle(await (await this.writeWorkspaceFiles(bundle)).getDirectoryHandle("capsules", { create: true }), filename), ownedBuffer(archive));
	}
	async writeWorkspaceFiles(bundle) {
		const selection = await this.requireWritableSelection(bundle.key.id);
		const directory = await workspaceDirectory(selection.parent, selection.workspaceName);
		await writeFile(await directory.getFileHandle("workspace.json", { create: true }), jsonBlob(creatorWorkspaceManifest(bundle, selection.workspaceName)));
		await writeFile(await (await directory.getDirectoryHandle("recovery", { create: true })).getFileHandle(recoveryFilename(bundle.key.id), { create: true }), jsonBlob(bundle));
		return directory;
	}
	async restoreRecoveryBundleFromWorkspace(keyId) {
		try {
			const local = await this.recovery.load(keyId);
			if (local !== void 0) {
				await this.writeWorkspaceFiles(local);
				return true;
			}
		} catch {}
		const selection = await this.selections.load(keyId);
		if (selection === void 0 || await selection.parent.queryPermission({ mode: "readwrite" }) !== "granted") return false;
		try {
			const handle = await (await (await workspaceDirectory(selection.parent, selection.workspaceName)).getDirectoryHandle("recovery")).getFileHandle(recoveryFilename(keyId));
			const bundle = parseCreatorSigningKeyRecoveryBundle(JSON.parse(await (await handle.getFile()).text()));
			if (bundle.key.id !== keyId) return false;
			await this.recovery.save(bundle);
			return true;
		} catch {
			return false;
		}
	}
	async requireWritableSelection(keyId) {
		const selection = await this.selections.load(keyId);
		if (selection === void 0) throw new CreatorWorkspaceError("invalid_selection");
		if (await selection.parent.queryPermission({ mode: "readwrite" }) !== "granted") throw new CreatorWorkspaceError("permission_required");
		return selection;
	}
};
function creatorWorkspaceManifest(bundleInput, workspaceName) {
	assertWorkspaceName(workspaceName);
	const bundle = parseCreatorSigningKeyRecoveryBundle(bundleInput);
	return Object.freeze({
		type: "share-capsules-workspace",
		version: 1,
		workspace_id: bundle.key.id,
		name: workspaceName,
		signing_key: Object.freeze({
			id: bundle.key.id,
			algorithm: bundle.key.algorithm,
			public_key: bundle.key.public_key
		})
	});
}
function creatorWorkspaceNameFromAccountLabel(label) {
	const normalized = label.normalize("NFKD").replaceAll(/[^A-Za-z0-9]+/gu, "-").replaceAll(/^-|-$/gu, "").toLowerCase().slice(0, 64);
	return isCreatorWorkspaceName(normalized) ? normalized : "share-capsules-account";
}
function isCreatorWorkspaceName(value) {
	return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) && value.length <= 64;
}
function assertWorkspaceName(value) {
	if (!isCreatorWorkspaceName(value)) throw new Error("Workspace name must use lowercase letters, numbers, and hyphens.");
}
async function workspaceDirectory(parent, workspaceName) {
	return (await parent.getDirectoryHandle(CREATOR_WORKSPACE_ROOT, { create: true })).getDirectoryHandle(workspaceName, { create: true });
}
async function uniqueFileHandle(directory, filename) {
	const extension = ".capsule";
	const stem = filename.slice(0, -8);
	for (let index = 1; index <= 1e4; index++) {
		const candidate = index === 1 ? filename : `${stem}-${index}${extension}`;
		try {
			await directory.getFileHandle(candidate);
		} catch (error) {
			if (isNotFound(error)) return directory.getFileHandle(candidate, { create: true });
			throw error;
		}
	}
	throw new Error("No available Capsule filename.");
}
async function writeFile(handle, data) {
	let writable;
	try {
		writable = await handle.createWritable();
	} catch {
		throw new CreatorWorkspaceError("write_failed");
	}
	try {
		await writable.write(data);
		await writable.close();
	} catch (error) {
		await writable.abort().catch(() => void 0);
		if (error instanceof CreatorWorkspaceError) throw error;
		throw new CreatorWorkspaceError("write_failed");
	}
}
function storedSelection(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const candidate = value;
	if (typeof candidate.keyId !== "string" || !/^creator_[a-f0-9]{32}$/u.test(candidate.keyId) || typeof candidate.workspaceName !== "string" || !isCreatorWorkspaceName(candidate.workspaceName) || !isDirectoryHandle(candidate.parent)) return;
	return candidate;
}
function isDirectoryHandle(value) {
	return typeof value === "object" && value !== null && value.kind === "directory" && typeof value.name === "string" && typeof value.getDirectoryHandle === "function" && typeof value.getFileHandle === "function" && typeof value.queryPermission === "function";
}
function recoveryStorageKey(keyId) {
	return `creator_workspace_recovery_${keyId}`;
}
function recoveryFilename(keyId) {
	assertCreatorKeyId(keyId);
	return `${keyId.replace("_", "-")}.encrypted.json`;
}
function assertCreatorKeyId(keyId) {
	if (!/^creator_[a-f0-9]{32}$/u.test(keyId)) throw new Error("Invalid creator signing-key ID.");
}
function assertCapsuleFilename(filename) {
	if (!/^[a-z0-9](?:[a-z0-9-]{0,79})\.capsule$/u.test(filename)) throw new Error("Invalid workspace Capsule filename.");
}
function jsonBlob(value) {
	return new Blob([JSON.stringify(value, void 0, 2)], { type: "application/json" });
}
function ownedBuffer(bytes) {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}
function isNotFound(error) {
	return error instanceof DOMException && error.name === "NotFoundError";
}
function requestResult(request) {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => resolve(request.result), { once: true });
		request.addEventListener("error", () => reject(request.error), { once: true });
	});
}
function transactionDone(transaction) {
	return new Promise((resolve, reject) => {
		transaction.addEventListener("complete", () => resolve(), { once: true });
		transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
		transaction.addEventListener("error", () => reject(transaction.error), { once: true });
	});
}
//#endregion
//#region apps/browser-extension/src/creator-studio-page.ts
async function replacementWorkspaceRecoveryMaterials(keyId, keyRing, recoveryService, workspace) {
	if (await workspace.hasRecoveryBundle(keyId)) return void 0;
	const key = await keyRing.activeSigningKey();
	if (key.id !== keyId) throw new Error("Active signing key changed during recovery preparation.");
	return recoveryService.create(key);
}
function mountCreatorStudioPage(root, draft, options = {}) {
	const parsedDraft = parseCreatorStudioDraftV1(draft);
	const keyRing = options.keyRing ?? new CreatorSigningKeyRing(new IndexedDbCreatorSigningKeyStore());
	const surface = new CreatorStudioSurface(parsedDraft, options.picker ?? new BrowserFilePicker(root.ownerDocument), new CreatorStudioPageRenderer(root), CREATOR_CONTENT_PROFILE_REGISTRY.resolve("ctx.content.static-image", "1.0"));
	requiredElement(root, "[data-creator-source-button]", HTMLButtonElement).addEventListener("click", () => void surface.chooseSource());
	surface.start();
	const signingKeyPanel = mountCreatorSigningKeyPanel(root, keyRing, options.recoveryService ?? new CreatorSigningKeyRecoveryService(), () => setCreatorCreationControlsReady(root), options.workspaceRecoveryWriter);
	mountCreatorBuildPanel(root, options.createWorkflow?.(surface, keyRing), parsedDraft.description.title, signingKeyPanel);
	setCreatorCreationControlsEnabled(root, false);
	const workspacePanel = mountCreatorWorkspacePanel(root, keyRing, options.workspaceSelector, () => {
		setCreatorCreationControlsEnabled(root, false);
		setCreatorBuildStatus(root, "Checking workspace recovery…");
		signingKeyPanel.prepareForCreation().then((state) => {
			if (state === "confirmation-required") {
				setCreatorBuildStatus(root, "Save and confirm the recovery code above before creating this Capsule.");
				return;
			}
			if (state === "save-location-required") {
				setCreatorBuildStatus(root, "Choose the workspace location again to continue.");
				return;
			}
			if (state !== "ready") setCreatorBuildStatus(root, "Recovery could not be prepared. Use the recovery options above.");
		});
	}, options.accountLabel);
	mountCreatorAccountPanel(root, options.connectAccount, options.isAccountConnected, () => workspacePanel.prepare());
	mountCreatorHostIntegrationPanel(root, parsedDraft.fallback.alt_text, options.instructionsBaseUrl);
	return surface;
}
function mountCreatorWorkspacePanel(root, keyRing, selector, onReady = () => void 0, accountLabel = "share-capsules-account") {
	const name = requiredElement(root, "[data-creator-workspace-name]", HTMLInputElement);
	const button = requiredElement(root, "[data-creator-workspace-choose]", HTMLButtonElement);
	const status = requiredElement(root, "[data-creator-workspace-status]", HTMLElement);
	const buildStatus = requiredElement(root, "[data-creator-build-status]", HTMLElement);
	let keyId;
	let preparing = false;
	const showStatus = (workspace) => {
		name.value = workspace.workspaceName;
		if (workspace.writable) {
			button.textContent = "Change";
			status.textContent = `${workspace.parentName}/share-capsules/${workspace.workspaceName}`;
			onReady();
			return;
		}
		button.textContent = "Change";
		status.textContent = `share-capsules/${workspace.workspaceName} — choose the parent folder again`;
	};
	const prepare = () => {
		if (preparing) return;
		preparing = true;
		setCreatorCreationControlsEnabled(root, false);
		button.disabled = true;
		status.textContent = "Checking your workspace…";
		buildStatus.textContent = "Checking your workspace…";
		ensureActiveCreatorSigningKey(keyRing).then(async (activeKeyId) => {
			keyId = activeKeyId;
			const preferredWorkspaceName = creatorWorkspaceNameFromAccountLabel(accountLabel);
			name.value = preferredWorkspaceName;
			if (selector === void 0) {
				status.textContent = "Workspace selection is unavailable in this build.";
				return;
			}
			const workspace = await selector.status(activeKeyId, preferredWorkspaceName);
			if (workspace === void 0) {
				button.textContent = "Choose workspace";
				status.textContent = `share-capsules/${name.value} — choose parent folder`;
				buildStatus.textContent = "Choose the workspace location before creating a Capsule.";
				return;
			}
			showStatus(workspace);
		}).catch(() => {
			status.textContent = "The workspace could not be prepared.";
		}).finally(() => {
			preparing = false;
			button.disabled = selector === void 0;
		});
	};
	button.addEventListener("click", () => {
		if (selector === void 0 || keyId === void 0 || button.disabled) return;
		const workspaceName = name.value.trim();
		if (!isCreatorWorkspaceName(workspaceName)) {
			status.textContent = "Use lowercase letters, numbers, and hyphens for the workspace name.";
			return;
		}
		setCreatorCreationControlsEnabled(root, false);
		button.disabled = true;
		status.textContent = "Choose the folder that will contain share-capsules…";
		buildStatus.textContent = "Choose the workspace location to continue…";
		selector.choose(keyId, workspaceName).then(showStatus).catch(() => {
			status.textContent = "The workspace location was not changed.";
			buildStatus.textContent = "Choose the workspace location before creating a Capsule.";
		}).finally(() => {
			button.disabled = false;
		});
	});
	return Object.freeze({ prepare });
}
async function ensureActiveCreatorSigningKey(keyRing) {
	let active = (await keyRing.list()).find((key) => key.status === "active");
	if (active === void 0) {
		await keyRing.generate();
		active = (await keyRing.list()).find((key) => key.status === "active");
	}
	if (active === void 0) throw new Error("Creator signing key was not created.");
	return active.id;
}
async function checkCreatorAccountConnection(isConnected) {
	if (isConnected === void 0) return "disconnected";
	try {
		return await isConnected() ? "connected" : "disconnected";
	} catch {
		return "check-failed";
	}
}
async function establishCreatorAccountConnection(connect, isConnected) {
	if (await checkCreatorAccountConnection(isConnected) === "connected") return "connected";
	try {
		await connect();
		return "connected";
	} catch {
		return "failed";
	}
}
function mountCreatorAccountPanel(root, connect, isConnected, onConnected = () => void 0) {
	const button = requiredElement(root, "[data-creator-account-connect]", HTMLButtonElement);
	const status = requiredElement(root, "[data-creator-account-status]", HTMLElement);
	const indicator = requiredElement(root, "[data-creator-account]", HTMLElement);
	if (connect === void 0) {
		button.disabled = true;
		setCreatorCreationControlsEnabled(root, false);
		button.hidden = false;
		indicator.dataset.state = "error";
		status.textContent = "Account unavailable";
		return;
	}
	const establish = () => {
		button.disabled = true;
		setCreatorCreationControlsEnabled(root, false);
		indicator.dataset.state = "checking";
		status.textContent = "Connecting…";
		establishCreatorAccountConnection(connect, isConnected).then((state) => {
			if (state === "connected") {
				button.hidden = true;
				indicator.dataset.state = "connected";
				onConnected();
				status.textContent = "Connected";
				return;
			}
			button.hidden = false;
			button.textContent = "Retry";
			setCreatorCreationControlsEnabled(root, false);
			indicator.dataset.state = "error";
			status.textContent = "Not connected";
		}).finally(() => {
			button.disabled = false;
		});
	};
	button.addEventListener("click", establish);
	establish();
}
function setCreatorCreationControlsEnabled(root, enabled) {
	requiredElement(root, "[data-creator-source-button]", HTMLButtonElement).disabled = !enabled;
	requiredElement(root, "[data-creator-build]", HTMLButtonElement).disabled = !enabled;
}
function setCreatorBuildStatus(root, text) {
	requiredElement(root, "[data-creator-build-status]", HTMLElement).textContent = text;
}
function setCreatorSetupStatus(element, text, state) {
	element.textContent = text;
	element.dataset.state = state;
}
function setCreatorCreationControlsReady(root) {
	setCreatorCreationControlsEnabled(root, true);
	requiredElement(root, "[data-creator-build-status]", HTMLElement).textContent = "Ready to create and save your Capsule.";
}
function mountCreatorBuildPanel(root, workflow, defaultName = "share-capsule", preparation) {
	const button = requiredElement(root, "[data-creator-build]", HTMLButtonElement);
	const status = requiredElement(root, "[data-creator-build-status]", HTMLElement);
	const name = requiredElement(root, "[data-creator-capsule-name]", HTMLInputElement);
	name.value = capsuleFilename(defaultName);
	if (workflow === void 0) {
		button.disabled = true;
		status.textContent = "The extension runtime is not connected.";
		return;
	}
	button.disabled = false;
	button.addEventListener("click", () => {
		const filename = name.value.trim();
		if (filename === "") {
			status.textContent = "Enter a name for the Capsule file.";
			name.focus();
			return;
		}
		name.value = capsuleFilename(filename);
		name.dispatchEvent(new Event("input", { bubbles: true }));
		button.disabled = true;
		status.textContent = "Preparing your recovery files and saved Capsule…";
		Promise.resolve(preparation?.prepareForCreation() ?? "ready").then((state) => {
			if (state === "confirmation-required") {
				status.textContent = "Save and confirm the recovery code below, then click Create and save Capsule again.";
				return;
			}
			if (state === "save-location-required") {
				status.textContent = "Choose the save location again, then click Create and save Capsule.";
				requiredElement(root, "[data-creator-workspace-choose]", HTMLButtonElement).focus();
				return;
			}
			if (state !== "ready") {
				status.textContent = "Recovery files could not be prepared. Check the workspace and recovery section above.";
				return;
			}
			status.textContent = "Encrypting, signing, verifying, and saving your Capsule…";
			return workflow.buildAndDownload(name.value);
		}).then(() => {
			if (status.textContent.startsWith("Encrypting")) status.textContent = "Your verified Capsule has been saved.";
		}).catch((error) => {
			status.textContent = creatorBuildErrorMessage(error);
		}).finally(() => {
			button.disabled = false;
		});
	});
}
function creatorBuildErrorMessage(error) {
	if (!(error instanceof CreatorCapsuleWorkflowError)) return "The Capsule could not be created. No unverified file was downloaded.";
	if (error.code === "build_failed") return creatorBuildFailureMessage(error.detail);
	return {
		file_required: "Choose a supported file before creating your Capsule.",
		signing_key_required: "Create or restore a signing key and save its recovery kit first.",
		session_required: "Connect this extension to your Share Capsules account first.",
		download_failed: "The Capsule was verified, but the browser could not save it."
	}[error.code];
}
function creatorBuildFailureMessage(detail) {
	return {
		broker_registration_failed: "The Capsule key could not be registered with Share Capsules. Nothing was saved.",
		build_failed: "The Capsule could not be safely built and verified. Nothing was saved.",
		grant_failed: "Share Capsules rejected the registration approval. Reconnect your account and try again.",
		invalid_configuration: "The extension is not configured for this Share Capsules environment.",
		invalid_grant_response: "Share Capsules returned an unexpected registration approval response. Nothing was saved.",
		invalid_input: "Share Capsules could not accept this Capsule policy. Check the access settings and try again.",
		invalid_lifecycle_response: "Share Capsules returned an unexpected Capsule activation response. Nothing was saved.",
		invalid_registration_response: "The key service returned an unexpected registration response. Nothing was saved.",
		invalid_source: "The selected file changed or could not be verified. Choose the file again.",
		invalid_token: "Your account connection expired. Reconnect this extension and try again.",
		archive_assembly_failed: "The Capsule package could not be assembled safely. Nothing was saved.",
		archive_verification_failed: "The Capsule package was created, but the extension could not verify it. Nothing was saved.",
		manifest_signing_failed: "The Capsule could not be signed with this browser’s creator key. Nothing was saved.",
		manifest_validation_failed: "The Capsule details could not be converted into a valid Capsule manifest. Nothing was saved.",
		payload_encryption_failed: "The selected file could not be encrypted safely. Nothing was saved.",
		policy_build_failed: "The access settings could not be converted into a valid Capsule policy. Nothing was saved.",
		recovery_required: "Create or restore a signing key and save its recovery kit first.",
		registration_failed: "The Capsule key service could not register this Capsule. Nothing was saved.",
		verified_manifest_mismatch: "The Capsule package did not verify against the generated manifest. Nothing was saved."
	}[detail ?? ""] ?? "The Capsule could not be safely built and verified. Nothing was saved.";
}
function mountCreatorHostIntegrationPanel(root, fallbackText, instructionsBaseUrl = "https://sharecapsules.com/instructions") {
	const markup = requiredElement(root, "[data-creator-host-markup]", HTMLTextAreaElement);
	const copy = requiredElement(root, "[data-creator-host-copy]", HTMLButtonElement);
	const status = requiredElement(root, "[data-creator-host-status]", HTMLElement);
	const capsuleName = requiredElement(root, "[data-creator-capsule-name]", HTMLInputElement);
	const instructions = requiredElement(root, "[data-creator-instructions-link]", HTMLAnchorElement);
	instructions.href = `${instructionsBaseUrl}#capsule-hosting`;
	const update = () => {
		try {
			markup.value = createCreatorHostIntegrationV1({
				capsuleUrl: exampleCapsuleUrlForFilename(capsuleFilename(capsuleName.value)),
				fallbackText
			}).markup;
			copy.disabled = false;
			status.textContent = "Replace example.com with your real website when you publish.";
		} catch {
			markup.value = "";
			copy.disabled = true;
			status.textContent = "Enter a valid Capsule file name to see example markup.";
		}
	};
	capsuleName.addEventListener("input", update);
	copy.addEventListener("click", () => {
		if (copy.disabled || markup.value === "") return;
		const clipboard = root.ownerDocument.defaultView?.navigator.clipboard;
		if (clipboard === void 0) {
			selectMarkup(markup, status);
			return;
		}
		clipboard.writeText(markup.value).then(() => {
			status.textContent = "Markup copied.";
		}).catch(() => {
			selectMarkup(markup, status);
		});
	});
	update();
}
function selectMarkup(markup, status) {
	markup.focus();
	markup.select();
	status.textContent = "The markup is selected. Copy it with your keyboard.";
}
function mountCreatorSigningKeyPanel(root, keyRing = new CreatorSigningKeyRing(new IndexedDbCreatorSigningKeyStore()), recoveryService = new CreatorSigningKeyRecoveryService(), onReady = () => void 0, workspaceRecoveryWriter) {
	const button = requiredElement(root, "[data-creator-signing-key-button]", HTMLButtonElement);
	const status = requiredElement(root, "[data-creator-signing-key-status]", HTMLElement);
	const list = requiredElement(root, "[data-creator-signing-key-list]", HTMLUListElement);
	const recoveryButton = requiredElement(root, "[data-creator-recovery-create]", HTMLButtonElement);
	const recoveryPanel = requiredElement(root, "[data-creator-recovery-panel]", HTMLElement);
	const recoveryCode = requiredElement(root, "[data-creator-recovery-code]", HTMLElement);
	const buildStatus = requiredElement(root, "[data-creator-build-status]", HTMLElement);
	const bundleSaved = requiredElement(root, "[data-creator-recovery-bundle-saved]", HTMLInputElement);
	const codeSaved = requiredElement(root, "[data-creator-recovery-code-saved]", HTMLInputElement);
	const confirmButton = requiredElement(root, "[data-creator-recovery-confirm]", HTMLButtonElement);
	const restoreBundle = requiredElement(root, "[data-creator-recovery-file]", HTMLInputElement);
	const restoreCode = requiredElement(root, "[data-creator-recovery-restore-code]", HTMLInputElement);
	const restoreButton = requiredElement(root, "[data-creator-recovery-restore]", HTMLButtonElement);
	const restoreDetails = restoreButton.closest("details");
	if (!(restoreDetails instanceof HTMLDetailsElement)) throw new Error("Creator Studio is missing recovery restore details.");
	let recoveryMaterials;
	let recoveryKeyId;
	let preparationRequested = false;
	let preparing = false;
	const render = (keys) => {
		list.replaceChildren(...keys.map((key) => {
			const item = root.ownerDocument.createElement("li");
			const label = root.ownerDocument.createElement("strong");
			label.textContent = key.status === "active" ? "Active signing key" : "Previous key";
			const detail = root.ownerDocument.createElement("span");
			const recovery = key.recoveryStatus === "confirmed" ? "recovery kit saved" : "recovery kit needed";
			detail.textContent = `${key.id} · ${key.status} · ${recovery}`;
			item.append(label, detail);
			return item;
		}));
		setCreatorSetupStatus(status, keys.some((key) => key.status === "active") ? "Signing key ready" : "Key needed", keys.some((key) => key.status === "active") ? "checking" : "attention");
		button.textContent = keys.length === 0 ? "Create signing key" : "Create replacement key";
		button.disabled = false;
		const active = keys.find((key) => key.status === "active");
		recoveryButton.hidden = active === void 0 || active.recoveryStatus === "confirmed";
		recoveryButton.disabled = active === void 0;
		if (active?.recoveryStatus === "confirmed") {
			recoveryPanel.hidden = true;
			setCreatorSetupStatus(status, "Recovery ready", "ready");
			if (preparationRequested) {
				buildStatus.textContent = "Ready to create and save your Capsule.";
				onReady();
			}
		}
	};
	const refresh = async () => render(await keyRing.list());
	const saveRecoveryBundle = async (bundle) => {
		if (workspaceRecoveryWriter !== void 0) {
			await workspaceRecoveryWriter.saveAndDownload(bundle);
			return;
		}
		downloadRecoveryBundle(root.ownerDocument, bundle.key.id, bundle);
	};
	const showRecoveryMaterials = async (keyId, materials) => {
		await saveRecoveryBundle(materials.bundle);
		recoveryMaterials = materials;
		recoveryKeyId = keyId;
		recoveryCode.textContent = materials.recoveryCode;
		bundleSaved.checked = false;
		codeSaved.checked = false;
		confirmButton.disabled = true;
		recoveryPanel.hidden = false;
		setCreatorSetupStatus(status, "Save recovery code", "attention");
		buildStatus.textContent = "One-time setup: save and confirm the recovery code below before creating this Capsule.";
	};
	const createRecoveryMaterials = async () => {
		const key = await keyRing.activeSigningKey();
		await showRecoveryMaterials(key.id, await recoveryService.create(key));
	};
	const prepareForCreation = async () => {
		if (preparing) return "failed";
		preparing = true;
		preparationRequested = true;
		button.disabled = true;
		recoveryButton.disabled = true;
		setCreatorSetupStatus(status, "Checking recovery…", "checking");
		try {
			const result = await prepareCreatorSigningRecovery(keyRing, recoveryService);
			if (result.status === "ready") {
				if (workspaceRecoveryWriter !== void 0) {
					const replacement = await replacementWorkspaceRecoveryMaterials(result.keyId, keyRing, recoveryService, workspaceRecoveryWriter);
					if (replacement !== void 0) {
						await showRecoveryMaterials(result.keyId, replacement);
						recoveryPanel.scrollIntoView({
							behavior: "smooth",
							block: "center"
						});
						return "confirmation-required";
					}
				}
				await refresh();
				return "ready";
			}
			await showRecoveryMaterials(result.keyId, result.materials);
			recoveryPanel.scrollIntoView({
				behavior: "smooth",
				block: "center"
			});
			return "confirmation-required";
		} catch (error) {
			if (error instanceof CreatorWorkspaceError && [
				"invalid_selection",
				"permission_required",
				"write_failed"
			].includes(error.code)) {
				setCreatorSetupStatus(status, "Workspace needed", "attention");
				return "save-location-required";
			}
			restoreDetails.open = true;
			setCreatorSetupStatus(status, "Recovery needs help", "error");
			return "failed";
		} finally {
			preparing = false;
			button.disabled = false;
			recoveryButton.disabled = false;
		}
	};
	button.addEventListener("click", () => {
		button.disabled = true;
		setCreatorSetupStatus(status, "Creating key…", "checking");
		keyRing.generate().then(refresh).catch(() => {
			setCreatorSetupStatus(status, "Key failed", "error");
		}).finally(() => {
			button.disabled = false;
		});
	});
	recoveryButton.addEventListener("click", () => {
		recoveryButton.disabled = true;
		setCreatorSetupStatus(status, "Creating recovery…", "checking");
		createRecoveryMaterials().catch(() => {
			setCreatorSetupStatus(status, "Recovery failed", "error");
		}).finally(() => {
			recoveryButton.disabled = false;
		});
	});
	const updateConfirmation = () => {
		confirmButton.disabled = recoveryMaterials === void 0 || !bundleSaved.checked || !codeSaved.checked;
	};
	bundleSaved.addEventListener("change", updateConfirmation);
	codeSaved.addEventListener("change", updateConfirmation);
	confirmButton.addEventListener("click", () => {
		if (recoveryKeyId === void 0 || confirmButton.disabled) return;
		confirmButton.disabled = true;
		keyRing.confirmRecoverySaved(recoveryKeyId).then(() => {
			recoveryMaterials = void 0;
			recoveryKeyId = void 0;
			recoveryCode.textContent = "";
			return refresh();
		}).catch(() => {
			setCreatorSetupStatus(status, "Confirm failed", "error");
			updateConfirmation();
		});
	});
	restoreButton.addEventListener("click", () => {
		const file = restoreBundle.files?.item(0);
		if (file === null || file === void 0 || restoreCode.value === "") {
			setCreatorSetupStatus(status, "Restore info needed", "attention");
			return;
		}
		restoreButton.disabled = true;
		setCreatorSetupStatus(status, "Restoring key…", "checking");
		readRecoveryBundle(file).then(async (bundle) => ({
			bundle,
			recovered: await recoveryService.recover(bundle, restoreCode.value)
		})).then(async ({ bundle, recovered }) => {
			const active = (await keyRing.list()).find((key) => key.status === "active");
			if (active === void 0 || active.id !== recovered.id) await keyRing.restore(recovered);
			else if (active.publicKey !== recovered.publicKey) throw new Error("The recovery key does not match the active signing key.");
			await saveRecoveryBundle(bundle);
		}).then(() => {
			restoreCode.value = "";
			restoreBundle.value = "";
			return refresh();
		}).catch(() => {
			setCreatorSetupStatus(status, "Restore failed", "error");
		}).finally(() => {
			restoreButton.disabled = false;
		});
	});
	refresh().catch(() => {
		setCreatorSetupStatus(status, "Key unavailable", "error");
		button.disabled = true;
	});
	return Object.freeze({ prepareForCreation });
}
async function prepareCreatorSigningRecovery(keyRing, recoveryService) {
	let active = (await keyRing.list()).find((key) => key.status === "active");
	if (active?.recoveryStatus === "confirmed") return {
		status: "ready",
		keyId: active.id
	};
	if (active === void 0) {
		await keyRing.generate();
		active = (await keyRing.list()).find((key) => key.status === "active");
	}
	if (active === void 0) throw new Error("Creator signing key was not created.");
	const key = await keyRing.activeSigningKey();
	return {
		status: "save-required",
		keyId: key.id,
		materials: await recoveryService.create(key)
	};
}
async function readRecoveryBundle(file) {
	if (file.size < 1 || file.size > 16384) throw new Error("Invalid recovery bundle size.");
	return parseCreatorSigningKeyRecoveryBundle(JSON.parse(await file.text()));
}
function downloadRecoveryBundle(document, keyId, bundle) {
	const view = document.defaultView;
	if (view === null) throw new Error("Creator Studio does not have a browser window.");
	const blob = new Blob([JSON.stringify(bundle, void 0, 2)], { type: "application/json" });
	const url = view.URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${keyId}.sharecapsules-recovery.json`;
	link.click();
	view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
}
var BrowserFilePicker = class {
	document;
	constructor(document) {
		this.document = document;
	}
	choose() {
		return new Promise((resolve) => {
			const input = this.document.createElement("input");
			input.type = "file";
			input.accept = "image/jpeg,image/png,image/webp";
			let settled = false;
			const finish = (source) => {
				if (settled) return;
				settled = true;
				resolve(source);
			};
			input.addEventListener("change", () => {
				const file = input.files?.item(0);
				finish(file === null || file === void 0 ? void 0 : {
					name: file.name,
					size: file.size,
					mediaType: file.type,
					file,
					read: async () => new Uint8Array(await file.arrayBuffer())
				});
			}, { once: true });
			input.addEventListener("cancel", () => finish(void 0), { once: true });
			input.click();
		});
	}
};
var CreatorStudioPageRenderer = class {
	root;
	constructor(root) {
		this.root = root;
	}
	render(model) {
		setText(this.root, "[data-creator-title]", model.title);
		setText(this.root, "[data-creator-description]", model.description ?? "No description provided");
		setText(this.root, "[data-creator-access]", model.accessSummary);
		setText(this.root, "[data-creator-total-limit]", model.totalLimitSummary);
		setText(this.root, "[data-creator-account-limit]", model.accountLimitSummary);
		setText(this.root, "[data-creator-automation-risk]", model.automationRiskSummary);
		setText(this.root, "[data-creator-selected-file]", model.sourceIssue ?? (model.selectedFile === void 0 ? model.status === "validating-file" ? "Checking the selected file…" : "No valid file selected" : `${model.selectedFile.name} (${formatFileSize(model.selectedFile.size)})`));
		const chooseButton = requiredElement(this.root, "[data-creator-source-button]", HTMLButtonElement);
		chooseButton.disabled = model.status === "choosing-file" || model.status === "validating-file";
		chooseButton.textContent = model.status === "choosing-file" ? "Choosing…" : model.status === "validating-file" ? "Checking…" : "Choose a file";
	}
};
function setText(root, selector, value) {
	requiredElement(root, selector, HTMLElement).textContent = value;
}
function requiredElement(root, selector, constructor) {
	const element = root.querySelector(selector);
	if (!(element instanceof constructor)) throw new Error(`Creator Studio is missing ${selector}.`);
	return element;
}
function formatFileSize(bytes) {
	return new Intl.NumberFormat(void 0, {
		maximumFractionDigits: 1,
		style: "unit",
		unit: "megabyte",
		unitDisplay: "short"
	}).format(bytes / 1e6);
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
			salt: toArrayBuffer(decodeBase64Url(challenge.nonce)),
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
	if (!isRecord(value)) throw new ViewerDeviceRegistrationError("invalid_response");
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
	if (!isRecord(value) || !isRecord(value.device)) throw new ViewerDeviceRegistrationError("invalid_response");
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
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStoredViewerDeviceKeys(value) {
	if (!isRecord(value)) return false;
	return typeof value.deviceId === "string" && value.proofPrivateKey instanceof CryptoKey && value.agreementPrivateKey instanceof CryptoKey && isRecord(value.proofPublicKey) && isRecord(value.agreementPublicKey);
}
function isKeyPair(value) {
	return "privateKey" in value && "publicKey" in value;
}
function toArrayBuffer(bytes) {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}
//#endregion
//#region apps/browser-extension/src/extension-messages.ts
var CREATOR_DRAFT_MESSAGE = "creator-draft-v1";
//#endregion
//#region apps/browser-extension/src/extension-runtime-config.ts
var CONTROL_PLANE = "https://sharecapsules.com";
var BROKER = "https://broker.sharecapsules.com";
var EXTENSION_ID = "jkejpdcobbbeichpodpeoiilnalepdph";
var OAUTH_CLIENT_ID = "418997f0-d3bd-4f91-811b-3352a006220f";
//#endregion
//#region apps/browser-extension/src/creator-runtime.ts
start();
async function start() {
	const root = document.querySelector("[data-creator-studio]");
	if (!(root instanceof HTMLElement)) return;
	try {
		const requestId = new URL(location.href).searchParams.get("request");
		if (requestId === null || !/^draft_[a-f0-9]{32}$/u.test(requestId)) throw new Error("Missing draft request.");
		const request = parseDraftResponse(await chrome.runtime.sendMessage({
			type: CREATOR_DRAFT_MESSAGE,
			requestId
		}));
		const registration = new CreatorBrokerRegistrationClient({
			grantEndpoint: `${CONTROL_PLANE}/api/broker-registration-grants`,
			broker: BROKER,
			lifecycleBaseEndpoint: `${CONTROL_PLANE}/api/capsule-registrations`
		});
		const deviceKeys = new IndexedDbViewerDeviceKeyStore();
		const credentials = new CreatorCredentialStore(chrome.storage.local, deviceKeys);
		const connector = new CreatorAccountConnector(new ExtensionOAuthClient({
			issuer: CONTROL_PLANE,
			authorizationEndpoint: `${CONTROL_PLANE}/oauth/authorize`,
			tokenEndpoint: `${CONTROL_PLANE}/oauth/token`,
			clientId: OAUTH_CLIENT_ID,
			redirectUri: `https://${EXTENSION_ID}.chromiumapp.org/oauth/callback`,
			scopes: ["extension:connect"],
			deviceScopes: ["ctx:authorize", "capsule:create"]
		}, new ChromeIdentityFlow(), new FetchOAuthTokenTransport()), new ViewerDeviceRegistrar(new FetchViewerDeviceRegistrationTransport(CONTROL_PLANE), deviceKeys), deviceKeys, credentials);
		const workspace = new FileSystemCreatorWorkspace(new CreatorWorkspaceRecoveryStore(chrome.storage.local), new IndexedDbCreatorWorkspaceSelectionStore());
		mountCreatorStudioPage(root, request.draft, {
			accountLabel: request.accountLabel,
			connectAccount: () => connector.ensureConnected("Creator extension"),
			isAccountConnected: async () => await credentials.active() !== void 0,
			createWorkflow: (surface, keyRing) => new CreatorCapsuleWorkflow(surface, keyRing, credentials, new CreatorCapsuleBuilderV1({
				ctxIssuer: CONTROL_PLANE,
				automationRiskIssuer: CONTROL_PLANE
			}, registration), registration, workspace, surface.draftValue().description.title),
			workspaceRecoveryWriter: workspace,
			instructionsBaseUrl: `${CONTROL_PLANE}/instructions`,
			workspaceSelector: {
				status: (keyId, preferredWorkspaceName) => workspace.status(keyId, preferredWorkspaceName),
				choose: async (keyId, workspaceName) => {
					const picker = window.showDirectoryPicker;
					if (picker === void 0) throw new Error("Directory selection is unavailable in this browser.");
					const parent = await picker.call(window, { mode: "readwrite" });
					return workspace.select(keyId, workspaceName, parent);
				}
			}
		});
	} catch {
		root.replaceChildren(message("This Creator request is unavailable or has already been used."));
	}
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
function parseDraftResponse(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value) || Object.keys(value).sort().join(",") !== "accountLabel,draft,type") throw new Error("Invalid draft response.");
	const record = value;
	if (record.type !== "creator-draft-v1" || typeof record.draft !== "string" || record.draft.length > 16384 || typeof record.accountLabel !== "string" || record.accountLabel.length < 3 || record.accountLabel.length > 320) throw new Error("Invalid draft response.");
	return {
		draft: record.draft,
		accountLabel: record.accountLabel
	};
}
function message(text) {
	const paragraph = document.createElement("p");
	paragraph.setAttribute("role", "alert");
	paragraph.textContent = text;
	return paragraph;
}
//#endregion

//# sourceMappingURL=studio.js.map