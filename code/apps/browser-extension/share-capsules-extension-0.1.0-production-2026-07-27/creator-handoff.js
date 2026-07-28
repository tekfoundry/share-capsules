(function() {
	//#region apps/browser-extension/src/extension-messages.ts
	var CREATOR_HANDOFF_MESSAGE = "creator-handoff-v1";
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
	function exactRecord(value, expected) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid extension message.");
		const record = value;
		const keys = Object.keys(record).sort();
		if (keys.length !== expected.length || keys.some((key, index) => key !== expected[index])) throw new Error("Invalid extension message.");
		return record;
	}
	//#endregion
	//#region apps/browser-extension/src/creator-handoff-content.ts
	var HANDOFF_EVENT = "sharecapsules:creator-handoff-v1";
	var ACCEPTED_EVENT = "sharecapsules:creator-handoff-accepted-v1";
	var FAILED_EVENT = "sharecapsules:creator-handoff-failed-v1";
	document.addEventListener(HANDOFF_EVENT, (event) => {
		if (!(event instanceof CustomEvent)) return;
		const detail = parseHandoffDetail(event.detail);
		if (detail === void 0) return;
		let message;
		try {
			message = parseCreatorHandoffMessage({
				type: CREATOR_HANDOFF_MESSAGE,
				draft: detail.draft,
				accountLabel: detail.accountLabel
			});
		} catch {
			return;
		}
		if (typeof chrome === "undefined" || chrome.runtime === void 0) {
			document.dispatchEvent(new CustomEvent(FAILED_EVENT));
			return;
		}
		chrome.runtime.sendMessage(message).then((response) => {
			if (isAcceptedResponse(response)) {
				document.dispatchEvent(new CustomEvent(ACCEPTED_EVENT));
				return;
			}
			document.dispatchEvent(new CustomEvent(FAILED_EVENT));
		}).catch(() => document.dispatchEvent(new CustomEvent(FAILED_EVENT)));
	});
	function parseHandoffDetail(value) {
		const parsed = typeof value === "string" ? parseJson(value) : value;
		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
		const record = parsed;
		if (Object.keys(record).sort().join(",") !== "accountLabel,draft") return void 0;
		if (typeof record.draft !== "string" || typeof record.accountLabel !== "string") return;
		return {
			draft: record.draft,
			accountLabel: record.accountLabel
		};
	}
	function parseJson(value) {
		try {
			return JSON.parse(value);
		} catch {
			return;
		}
	}
	function isAcceptedResponse(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && value.accepted === true;
	}
	//#endregion
})();

//# sourceMappingURL=creator-handoff.js.map