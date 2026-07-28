//#region apps/browser-extension/src/extension-messages.ts
var CREATOR_HANDOFF_MESSAGE = "creator-handoff-v1";
var CREATOR_DRAFT_MESSAGE = "creator-draft-v1";
function parseCreatorHandoffMessage(value) {
	const record = exactRecord(value, [
		"accountLabel",
		"draft",
		"type"
	]);
	if (record.type !== "creator-handoff-v1" || typeof record.draft !== "string" || record.draft.length < 2 || record.draft.length > 16384 || typeof record.accountLabel !== "string" || record.accountLabel.trim() !== record.accountLabel || record.accountLabel.length < 3 || record.accountLabel.length > 320) throw new Error("Invalid Creator handoff message.");
	return {
		type: CREATOR_HANDOFF_MESSAGE,
		draft: record.draft,
		accountLabel: record.accountLabel
	};
}
function parseCreatorDraftMessage(value) {
	const record = exactRecord(value, ["requestId", "type"]);
	if (record.type !== "creator-draft-v1" || typeof record.requestId !== "string" || !/^draft_[a-f0-9]{32}$/u.test(record.requestId)) throw new Error("Invalid Creator draft request.");
	return {
		type: CREATOR_DRAFT_MESSAGE,
		requestId: record.requestId
	};
}
function exactRecord(value, expected) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid extension message.");
	const record = value;
	const keys = Object.keys(record).sort();
	if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new Error("Invalid extension message.");
	return record;
}
//#endregion
//#region apps/browser-extension/src/viewer-content-script-registration.ts
var VIEWER_DISCOVERY_SCRIPT_ID = "share-capsules-viewer-discovery";
function viewerDiscoveryMatchesFromGrantedOrigins(origins) {
	return Object.freeze([...new Set(origins.filter(isViewerDiscoveryOrigin))].sort());
}
function isViewerDiscoveryOrigin(origin) {
	if (origin === "http://localhost/*" || origin === "http://127.0.0.1/*") return true;
	if (!origin.startsWith("https://") || !origin.endsWith("/*")) return false;
	return !origin.includes("@");
}
//#endregion
//#region apps/browser-extension/src/viewer-open-queue.ts
var VIEWER_OPEN_SLOT_ACQUIRE = "share-capsules-viewer-open-slot-acquire";
var VIEWER_OPEN_SLOT_RELEASE = "share-capsules-viewer-open-slot-release";
var ViewerOpenSlotQueue = class {
	activeRequestId;
	waiting = [];
	acquire(requestId, grant) {
		if (this.activeRequestId === void 0) {
			this.activeRequestId = requestId;
			grant();
			return;
		}
		this.waiting.push({
			requestId,
			grant
		});
	}
	release(requestId) {
		if (this.activeRequestId !== requestId) return false;
		this.activeRequestId = void 0;
		const next = this.waiting.shift();
		if (next !== void 0) {
			this.activeRequestId = next.requestId;
			next.grant();
		}
		return true;
	}
};
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
function parseViewerOpenSlotMessage(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const record = value;
	if ((record.type === "share-capsules-viewer-open-slot-acquire" || record.type === "share-capsules-viewer-open-slot-release") && typeof record.requestId === "string" && /^[a-z0-9_-]{16,80}$/u.test(record.requestId)) return record.type === "share-capsules-viewer-open-slot-acquire" ? viewerOpenSlotAcquireMessage(record.requestId) : viewerOpenSlotReleaseMessage(record.requestId);
}
//#endregion
//#region apps/browser-extension/src/extension-runtime-config.ts
var CONTROL_PLANE = "https://sharecapsules.com";
//#endregion
//#region apps/browser-extension/src/extension-service-worker.ts
var VIEWER_DISCOVERY_SCRIPT = Object.freeze({
	id: VIEWER_DISCOVERY_SCRIPT_ID,
	js: ["viewer-discovery.js"],
	runAt: "document_idle",
	allFrames: false,
	persistAcrossSessions: true
});
var viewerOpenSlots = new ViewerOpenSlotQueue();
ensureViewerDiscoveryContentScript();
chrome.runtime.onInstalled.addListener(() => void ensureViewerDiscoveryContentScript());
chrome.runtime.onStartup.addListener(() => void ensureViewerDiscoveryContentScript());
chrome.permissions.onAdded.addListener(() => void ensureViewerDiscoveryContentScript());
chrome.permissions.onRemoved.addListener(() => void ensureViewerDiscoveryContentScript());
chrome.runtime.onMessage.addListener((message, sender, respond) => {
	const viewerOpenSlot = parseViewerOpenSlotMessage(message);
	if (viewerOpenSlot !== void 0) {
		if (viewerOpenSlot.type === "share-capsules-viewer-open-slot-acquire") {
			viewerOpenSlots.acquire(viewerOpenSlot.requestId, () => respond({ granted: true }));
			return true;
		}
		respond({ released: viewerOpenSlots.release(viewerOpenSlot.requestId) });
		return false;
	}
	if (isCreatorPage(sender.url)) {
		acceptHandoff(message).then(respond).catch(() => respond({ accepted: false }));
		return true;
	}
	if (isCreatorExtensionPage(sender.url)) {
		takeDraft(message).then(respond).catch(() => respond(void 0));
		return true;
	}
});
async function ensureViewerDiscoveryContentScript() {
	try {
		const matches = viewerDiscoveryMatchesFromGrantedOrigins((await chrome.permissions.getAll()).origins ?? []);
		const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [VIEWER_DISCOVERY_SCRIPT.id] });
		if (matches.length === 0) {
			if (registered.length > 0) await chrome.scripting.unregisterContentScripts({ ids: [VIEWER_DISCOVERY_SCRIPT.id] });
			return;
		}
		if (registered.length === 0) {
			await chrome.scripting.registerContentScripts([{
				...VIEWER_DISCOVERY_SCRIPT,
				matches
			}]);
			return;
		}
		await chrome.scripting.updateContentScripts([{
			...VIEWER_DISCOVERY_SCRIPT,
			matches
		}]);
	} catch {}
}
async function acceptHandoff(value) {
	const message = parseCreatorHandoffMessage(value);
	const requestId = `draft_${crypto.randomUUID().replaceAll("-", "")}`;
	await chrome.storage.session.set({ [requestId]: {
		draft: message.draft,
		accountLabel: message.accountLabel
	} });
	await chrome.tabs.create({ url: `${chrome.runtime.getURL("creator-studio.html")}?request=${requestId}` });
	return { accepted: true };
}
function isCreatorExtensionPage(value) {
	if (value === void 0) return false;
	try {
		const actual = new URL(value);
		const expected = new URL(chrome.runtime.getURL("creator-studio.html"));
		return actual.origin === expected.origin && actual.pathname === expected.pathname && actual.hash === "";
	} catch {
		return false;
	}
}
async function takeDraft(value) {
	const message = parseCreatorDraftMessage(value);
	const draft = (await chrome.storage.session.get(message.requestId))[message.requestId];
	await chrome.storage.session.remove(message.requestId);
	return isStoredDraft(draft) ? {
		type: CREATOR_DRAFT_MESSAGE,
		draft: draft.draft,
		accountLabel: draft.accountLabel
	} : void 0;
}
function isStoredDraft(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) && typeof value.draft === "string" && typeof value.accountLabel === "string";
}
function isCreatorPage(value) {
	if (value === void 0) return false;
	try {
		const url = new URL(value);
		const controlPlane = new URL(CONTROL_PLANE);
		return url.origin === controlPlane.origin && url.pathname === "/studio/capsules/create" && url.search === "" && url.hash === "";
	} catch {
		return false;
	}
}
//#endregion

//# sourceMappingURL=service-worker.js.map