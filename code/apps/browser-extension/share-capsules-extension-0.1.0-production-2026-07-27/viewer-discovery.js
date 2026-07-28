(function() {
	//#region apps/browser-extension/src/viewer-capsule-discovery.ts
	var VIEWER_STATE_MESSAGE = "share-capsules-viewer-state";
	function normalizeCapsuleViewerCandidate(rawSource, fallbackText, baseUrl) {
		if (rawSource === null || rawSource.trim() === "") return void 0;
		let url;
		try {
			url = new URL(rawSource, baseUrl);
		} catch {
			return;
		}
		if (!isSupportedCapsuleUrl(url)) return void 0;
		return Object.freeze({
			capsuleUrl: url.href,
			fallbackText: normalizeFallbackText(fallbackText),
			debug: false
		});
	}
	function viewerDebugEnabled(element) {
		const value = element.getAttribute("debug");
		return value !== null && value.toLowerCase() !== "false" && value !== "0" && value.toLowerCase() !== "off";
	}
	function viewerImageFit(element) {
		const value = (element.getAttribute("fit") ?? element.getAttribute("image-fit"))?.toLowerCase();
		return value === "cover" || value === "fill" || value === "full-height" || value === "scale-down" ? value : "contain";
	}
	function viewerHeight(element) {
		const value = element.getAttribute("viewer-height")?.trim();
		if (value === void 0 || value === "") return void 0;
		return /^([1-9]\d{0,3})(px|rem|em|vh|vw)$/u.test(value) ? value : void 0;
	}
	function isSupportedCapsuleUrl(url) {
		if (url.username !== "" || url.password !== "") return false;
		if (url.protocol === "https:") return true;
		return url.protocol === "http:" && isLocalDevelopmentHost(url.hostname);
	}
	function discoverCapsuleViewerElements(document) {
		return Object.freeze([...document.querySelectorAll("capsule-viewer")].filter((element) => element instanceof HTMLElement && isDiscoverableCapsuleViewerElement(element)));
	}
	function isDiscoverableCapsuleViewerElement(element) {
		return element.localName.toLowerCase() === "capsule-viewer";
	}
	function markCapsuleViewerDetected(element, discovery, viewerFrameUrl) {
		if (element.querySelector("[data-share-capsules-viewer-frame]") !== null) return;
		element.dataset.shareCapsulesState = "detected";
		element.dataset.shareCapsulesSrc = discovery.capsuleUrl;
		element.setAttribute("data-share-capsules-discovered", "true");
		element.append(hiddenViewerFrameElement(element.ownerDocument, viewerFrameUrl, viewerHeight(element)));
	}
	function markCapsuleViewerActionRequired(element) {
		const frame = viewerFrame(element);
		if (frame === void 0) return;
		element.dataset.shareCapsulesState = "action-required";
		for (const child of element.children) {
			if (child === frame) {
				showStandaloneViewerFrame(frame);
				continue;
			}
			if (child instanceof HTMLElement) child.hidden = true;
		}
	}
	function markCapsuleViewerOpened(element, message) {
		const frame = viewerFrame(element);
		if (frame === void 0) return;
		element.dataset.shareCapsulesState = "opened";
		const template = element.querySelector(":scope > template");
		if (template instanceof HTMLTemplateElement) {
			const content = template.content.cloneNode(true);
			if (content instanceof DocumentFragment) {
				replaceTextPlaceholders(content, message);
				const placeholder = content.querySelector("content");
				if (placeholder instanceof HTMLElement) {
					moveFrameIntoPlaceholder(frame, placeholder);
					placeholder.replaceWith(frame);
				} else {
					showStandaloneViewerFrame(frame);
					content.append(frame);
				}
				element.replaceChildren(content);
				return;
			}
		}
		for (const child of element.children) {
			if (child instanceof HTMLIFrameElement && child.dataset.shareCapsulesViewerFrame !== void 0) {
				showStandaloneViewerFrame(child);
				continue;
			}
			if (child instanceof HTMLElement) child.hidden = true;
		}
	}
	function markCapsuleViewerError(element, message) {
		const error = element.querySelector(":scope > error");
		if (!(error instanceof HTMLElement)) {
			markCapsuleViewerActionRequired(element);
			return;
		}
		element.dataset.shareCapsulesState = "error";
		const content = element.ownerDocument.createDocumentFragment();
		for (const child of [...error.childNodes]) content.append(child.cloneNode(true));
		replaceTextPlaceholders(content, message);
		element.replaceChildren(content);
	}
	function viewerStateMessage(capsuleUrl, state = "opened", metadata = {}) {
		return {
			type: VIEWER_STATE_MESSAGE,
			state,
			capsuleUrl,
			...metadata
		};
	}
	function parseViewerStateMessage(value) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
		const record = value;
		if (record.type !== "share-capsules-viewer-state" || !isViewerState(record.state) || typeof record.capsuleUrl !== "string") return;
		return viewerStateMessage(record.capsuleUrl, record.state, {
			title: typeof record.title === "string" ? record.title : void 0,
			description: typeof record.description === "string" ? record.description : void 0,
			errorMessage: typeof record.errorMessage === "string" ? record.errorMessage : void 0
		});
	}
	function viewerFrameUrl(viewerFramePageUrl, capsuleUrl, siteOrigin, debug = false, imageFit = "contain") {
		const url = new URL(viewerFramePageUrl);
		url.searchParams.set("capsule", capsuleUrl);
		url.searchParams.set("site", siteOrigin);
		if (debug) url.searchParams.set("debug", "1");
		if (imageFit !== "contain") url.searchParams.set("image_fit", imageFit);
		return url.href;
	}
	function hiddenViewerFrameElement(document, frameUrl, height) {
		const frame = document.createElement("iframe");
		frame.setAttribute("data-share-capsules-viewer-frame", "loading");
		if (height !== void 0) frame.dataset.shareCapsulesViewerHeight = height;
		frame.title = "Share Capsules Viewer";
		frame.src = frameUrl;
		frame.loading = "eager";
		frame.referrerPolicy = "no-referrer";
		frame.style.position = "absolute";
		frame.style.width = "1px";
		frame.style.height = "1px";
		frame.style.opacity = "0";
		frame.style.pointerEvents = "none";
		frame.style.border = "0";
		return frame;
	}
	function viewerFrame(element) {
		const frame = element.querySelector("[data-share-capsules-viewer-frame]");
		return frame instanceof HTMLIFrameElement ? frame : void 0;
	}
	function showStandaloneViewerFrame(frame) {
		frame.dataset.shareCapsulesViewerFrame = "visible";
		frame.removeAttribute("class");
		frame.style.cssText = "";
		frame.style.display = "block";
		frame.style.width = "100%";
		const height = frame.dataset.shareCapsulesViewerHeight;
		if (height === void 0) frame.style.minHeight = "19rem";
		else frame.style.height = height;
		frame.style.marginTop = "0.75rem";
		frame.style.border = "0";
		frame.style.background = "transparent";
		frame.style.opacity = "1";
		frame.style.pointerEvents = "auto";
	}
	function moveFrameIntoPlaceholder(frame, placeholder) {
		frame.dataset.shareCapsulesViewerFrame = "opened";
		frame.className = placeholder.className;
		frame.style.cssText = placeholder.style.cssText;
		frame.style.border = "0";
		frame.style.opacity = "1";
		frame.style.pointerEvents = "auto";
		frame.style.background = frame.style.background || "transparent";
	}
	function replaceTextPlaceholders(root, message) {
		const values = {
			title: message.title ?? "Capsule",
			description: message.description ?? "",
			error_message: message.errorMessage ?? "This Capsule could not be opened."
		};
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let node = walker.nextNode();
		while (node !== null) {
			node.textContent = (node.textContent ?? "").replace(/\{\{\s*(title|description|error_message)\s*\}\}/gu, (_, key) => values[key]);
			node = walker.nextNode();
		}
	}
	function isViewerState(value) {
		return value === "action_required" || value === "opened" || value === "error";
	}
	function normalizeFallbackText(value) {
		return value.replace(/\s+/gu, " ").trim().slice(0, 1e3);
	}
	function isLocalDevelopmentHost(hostname) {
		return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
	}
	//#endregion
	//#region apps/browser-extension/src/viewer-discovery-content.ts
	if (window.top === window) {
		const extensionOrigin = new URL(chrome.runtime.getURL("viewer-frame.html")).origin;
		for (const element of discoverCapsuleViewerElements(document)) {
			const discovery = normalizeCapsuleViewerCandidate(element.getAttribute("src"), element.textContent ?? "", document.baseURI);
			if (discovery === void 0) continue;
			markCapsuleViewerDetected(element, discovery, viewerFrameUrl(chrome.runtime.getURL("viewer-frame.html"), discovery.capsuleUrl, location.origin, viewerDebugEnabled(element), viewerImageFit(element)));
		}
		window.addEventListener("message", (event) => {
			if (event.origin !== extensionOrigin) return;
			const message = parseViewerStateMessage(event.data);
			if (message === void 0) return;
			const viewer = [...document.querySelectorAll("capsule-viewer")].find((candidate) => {
				if (!(candidate instanceof HTMLElement)) return false;
				if (candidate.dataset.shareCapsulesSrc !== message.capsuleUrl) return false;
				const frame = candidate.querySelector("[data-share-capsules-viewer-frame]");
				return frame instanceof HTMLIFrameElement && frame.contentWindow === event.source;
			});
			if (!(viewer instanceof HTMLElement)) return;
			if (message.state === "opened") {
				markCapsuleViewerOpened(viewer, message);
				return;
			}
			if (message.state === "error") {
				markCapsuleViewerError(viewer, message);
				return;
			}
			markCapsuleViewerActionRequired(viewer);
		});
	}
	//#endregion
})();

//# sourceMappingURL=viewer-discovery.js.map