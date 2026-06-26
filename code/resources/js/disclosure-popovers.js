const popoverSelector = 'details[data-disclosure-popover]';

export const initializeDisclosurePopovers = () => {
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Node)) return;

        for (const popover of document.querySelectorAll(popoverSelector)) {
            if (!(popover instanceof HTMLDetailsElement) || !popover.open) continue;
            if (popover.contains(target)) continue;

            popover.open = false;
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        for (const popover of document.querySelectorAll(popoverSelector)) {
            if (popover instanceof HTMLDetailsElement) popover.open = false;
        }
    });
};
