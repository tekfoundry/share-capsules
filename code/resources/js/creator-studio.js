export const CAPSULE_CREATOR_HANDOFF_EVENT = 'sharecapsules:creator-handoff-v1';
export const CAPSULE_CREATOR_ACCEPTED_EVENT = 'sharecapsules:creator-handoff-accepted-v1';
export const CAPSULE_CREATOR_FAILED_EVENT = 'sharecapsules:creator-handoff-failed-v1';

const MAXIMUM_SAFE_LIMIT = Number.MAX_SAFE_INTEGER;

export class CreatorDraftValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CreatorDraftValidationError';
    }
}

export const buildCreatorDraft = (input) => {
    const title = input.title.trim();
    const description = input.description.trim();

    if (!title || title.length > 200) {
        throw new CreatorDraftValidationError('Enter a title of no more than 200 characters.');
    }

    if (description.length > 1000) {
        throw new CreatorDraftValidationError(
            'Enter a description of no more than 1,000 characters.',
        );
    }

    const accessWindow = buildAccessWindow(input.notBefore, input.notAfter);
    const globalLimit = input.globalLimit === '' ? null : parseLimit(input.globalLimit, 'total');
    const accountLimit =
        input.accountLimit === '' ? null : parseLimit(input.accountLimit, 'per-account');
    if (globalLimit !== null && accountLimit !== null && globalLimit < accountLimit) {
        throw new CreatorDraftValidationError(
            'The total limit must be greater than or equal to the per-account limit.',
        );
    }

    return Object.freeze({
        version: 1,
        description: Object.freeze({
            title,
            ...(description ? { description } : {}),
        }),
        fallback: Object.freeze({ alt_text: description || title }),
        policy: Object.freeze({
            ...(accessWindow ? { access_window: accessWindow } : {}),
            ...(globalLimit !== null ? { capsule_lifetime_maximum: globalLimit } : {}),
            ...(accountLimit !== null ? { account_capsule_lifetime_maximum: accountLimit } : {}),
            automation_risk_required: input.automationRiskRequired,
        }),
    });
};

export const initializeCapsuleCreatorHandoff = () => {
    const container = document.querySelector('[data-capsule-creator-draft]');
    if (!(container instanceof HTMLElement)) return;

    const button = container.querySelector('[data-capsule-extension-handoff]');
    const status = container.querySelector('[data-capsule-extension-status]');
    if (!(button instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) return;

    showCreatorTimeZone(container);
    initializePolicySummary(container);
    let responseTimer;

    button.addEventListener('click', () => {
        try {
            const draft = buildCreatorDraft(readDraftInput(container));
            window.clearTimeout(responseTimer);
            status.textContent = 'Waiting for the connected extension…';
            status.classList.remove('text-red-700');
            document.dispatchEvent(
                new CustomEvent(CAPSULE_CREATOR_HANDOFF_EVENT, {
                    detail: buildCreatorHandoffDetail(draft, readAccountLabel(container)),
                }),
            );
            responseTimer = window.setTimeout(() => showExtensionHandoffFailure(status), 5_000);
        } catch (error) {
            status.textContent =
                error instanceof CreatorDraftValidationError
                    ? error.message
                    : 'The Creator Studio draft could not be prepared.';
            status.classList.add('text-red-700');
        }
    });

    document.addEventListener(CAPSULE_CREATOR_ACCEPTED_EVENT, () => {
        window.clearTimeout(responseTimer);
        status.textContent = 'Draft transferred. Continue in the Share Capsules extension.';
        status.classList.remove('text-red-700');
    });
    document.addEventListener(CAPSULE_CREATOR_FAILED_EVENT, () => {
        window.clearTimeout(responseTimer);
        showExtensionHandoffFailure(status);
    });
};

const showExtensionHandoffFailure = (status) => {
    status.textContent =
        'The extension did not respond. Reload this page after loading or reloading the extension.';
    status.classList.add('text-red-700');
};

const readDraftInput = (container) => ({
    title: readText(container, 'title'),
    description: readText(container, 'description'),
    notBefore: calendarDateBoundary(readText(container, 'access_from_date'), false),
    notAfter: calendarDateBoundary(readText(container, 'access_through_date'), true),
    globalLimit: readText(container, 'global_limit'),
    accountLimit: readText(container, 'account_limit'),
    automationRiskRequired: readChecked(container, 'automation_risk_required'),
});

export const buildPolicySummary = (input) =>
    Object.freeze({
        baseline:
            'Active account, verified email, connected extension, and counted approved openings.',
        time: summarizeTimePolicy(input.accessFromDate, input.accessThroughDate),
        limit: summarizeLimitPolicy(input.globalLimit, input.accountLimit),
        trust: input.automationRiskRequired
            ? 'Viewer trust check required. The trust score considers recent usage patterns and quick human challenges before content opens.'
            : 'No viewer trust check configured.',
    });

const initializePolicySummary = (container) => {
    const outputs = {
        baseline: container.querySelector('[data-capsule-policy-summary="baseline"]'),
        time: container.querySelector('[data-capsule-policy-summary="time"]'),
        limit: container.querySelector('[data-capsule-policy-summary="limit"]'),
        trust: container.querySelector('[data-capsule-policy-summary="trust"]'),
    };
    if (!Object.values(outputs).every((output) => output instanceof HTMLElement)) return;

    const update = () => {
        const summary = buildPolicySummary({
            accessFromDate: readText(container, 'access_from_date'),
            accessThroughDate: readText(container, 'access_through_date'),
            globalLimit: readText(container, 'global_limit'),
            accountLimit: readText(container, 'account_limit'),
            automationRiskRequired: readChecked(container, 'automation_risk_required'),
        });

        for (const [key, value] of Object.entries(summary)) {
            outputs[key].textContent = value;
        }
    };

    for (const name of [
        'access_from_date',
        'access_through_date',
        'global_limit',
        'account_limit',
        'automation_risk_required',
    ]) {
        const input = container.querySelector(`[name="${name}"]`);
        if (input instanceof HTMLInputElement) input.addEventListener('input', update);
        if (input instanceof HTMLInputElement) input.addEventListener('change', update);
    }

    update();
};

const summarizeTimePolicy = (accessFromDate, accessThroughDate) => {
    if (!accessFromDate && !accessThroughDate) return 'No opening dates configured.';
    if (accessFromDate && accessThroughDate) {
        return `Opens from ${formatCalendarDate(accessFromDate)} through ${formatCalendarDate(accessThroughDate)}.`;
    }
    if (accessFromDate) return `Opens starting ${formatCalendarDate(accessFromDate)}.`;

    return `Opens through ${formatCalendarDate(accessThroughDate)}.`;
};

const summarizeLimitPolicy = (globalLimit, accountLimit) => {
    if (!globalLimit && !accountLimit) return 'No opening limits configured.';
    if (globalLimit && accountLimit) {
        return `Up to ${formatLimit(globalLimit)} total views and ${formatLimit(accountLimit)} views per viewer account.`;
    }
    if (globalLimit)
        return `Up to ${formatLimit(globalLimit)} total views across all viewer accounts.`;

    return `Up to ${formatLimit(accountLimit)} views per viewer account.`;
};

const formatCalendarDate = (value) => {
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;

    return `${month}/${day}/${year}`;
};

const formatLimit = (value) => {
    if (!/^\d+$/.test(value)) return value;

    return Number(value).toLocaleString();
};

const readAccountLabel = (container) => {
    const label = container.dataset.capsuleAccountLabel;
    return typeof label === 'string' && label.trim() === label && label.length > 0
        ? label
        : 'share-capsules-account';
};

export const buildCreatorHandoffDetail = (draft, accountLabel) =>
    JSON.stringify({
        draft: JSON.stringify(draft),
        accountLabel:
            typeof accountLabel === 'string' &&
            accountLabel.trim() === accountLabel &&
            accountLabel.length > 0
                ? accountLabel
                : 'share-capsules-account',
    });

export const calendarDateBoundary = (value, followingMidnight) => {
    if (value === '') return '';
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new CreatorDraftValidationError('Choose a valid calendar date.');

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const selected = new Date(0);
    selected.setFullYear(year, month - 1, day);
    selected.setHours(0, 0, 0, 0);
    if (
        selected.getFullYear() !== year ||
        selected.getMonth() !== month - 1 ||
        selected.getDate() !== day
    ) {
        throw new CreatorDraftValidationError('Choose a valid calendar date.');
    }

    const local = new Date(selected);
    if (followingMidnight) local.setDate(local.getDate() + 1);

    return local.toISOString().replace('.000Z', 'Z');
};

const buildAccessWindow = (notBefore, notAfter) => {
    if (!notBefore && !notAfter) return null;
    if ((notBefore && !isUtcSecond(notBefore)) || (notAfter && !isUtcSecond(notAfter))) {
        throw new CreatorDraftValidationError('The access dates could not be prepared.');
    }
    if (notBefore && notAfter && Date.parse(notBefore) >= Date.parse(notAfter)) {
        throw new CreatorDraftValidationError(
            'The closing date cannot be before the starting date.',
        );
    }

    return Object.freeze({
        ...(notBefore ? { not_before: notBefore } : {}),
        ...(notAfter ? { not_after: notAfter } : {}),
    });
};

const isUtcSecond = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value);

const showCreatorTimeZone = (container) => {
    const output = container.querySelector('[data-capsule-time-zone]');
    if (!(output instanceof HTMLElement)) return;

    output.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
};

const readText = (container, name) => {
    const input = container.querySelector(`[name="${name}"]`);
    return input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement
        ? input.value
        : '';
};

const readChecked = (container, name) => {
    const input = container.querySelector(`[name="${name}"]`);
    return input instanceof HTMLInputElement && input.checked;
};

const parseLimit = (value, label) => {
    if (!/^\d+$/.test(value)) {
        throw new CreatorDraftValidationError(`Enter a positive whole-number ${label} limit.`);
    }

    const limit = Number(value);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAXIMUM_SAFE_LIMIT) {
        throw new CreatorDraftValidationError(`Enter a positive whole-number ${label} limit.`);
    }

    return limit;
};
