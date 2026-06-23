const confirmationSelector = 'form[data-confirm]';

export const initializeConfirmationDialogs = () => {
    const dialog = document.querySelector('[data-confirmation-dialog]');
    if (
        typeof window.HTMLDialogElement === 'undefined' ||
        !(dialog instanceof window.HTMLDialogElement)
    ) {
        document.addEventListener('submit', (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || !form.matches(confirmationSelector)) return;
            if (!window.confirm(form.dataset.confirmMessage ?? 'Confirm this change?'))
                event.preventDefault();
        });
        return;
    }

    const title = dialog.querySelector('[data-confirmation-title]');
    const message = dialog.querySelector('[data-confirmation-message]');
    const cancel = dialog.querySelector('[data-confirmation-cancel]');
    const accept = dialog.querySelector('[data-confirmation-accept]');
    if (
        !(title instanceof HTMLElement) ||
        !(message instanceof HTMLElement) ||
        !(cancel instanceof HTMLButtonElement) ||
        !(accept instanceof HTMLButtonElement)
    )
        return;

    const confirmedForms = new WeakSet();
    let pendingForm = null;
    let pendingSubmitter = null;

    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !form.matches(confirmationSelector)) return;
        if (confirmedForms.delete(form)) return;

        event.preventDefault();
        pendingForm = form;
        pendingSubmitter = event.submitter;
        title.textContent = form.dataset.confirmTitle ?? 'Confirm this change';
        message.textContent = form.dataset.confirmMessage ?? 'This action may not be reversible.';
        accept.textContent = form.dataset.confirmAction ?? 'Confirm';

        const dangerous = form.dataset.confirmTone !== 'standard';
        accept.classList.toggle('bg-red-700', dangerous);
        accept.classList.toggle('hover:bg-red-800', dangerous);
        accept.classList.toggle('bg-brand', !dangerous);
        accept.classList.toggle('hover:bg-brand-strong', !dangerous);
        dialog.showModal();
    });

    cancel.addEventListener('click', () => dialog.close('cancel'));
    dialog.addEventListener('close', () => {
        pendingForm = null;
        pendingSubmitter = null;
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close('cancel');
    });
    accept.addEventListener('click', () => {
        const form = pendingForm;
        const submitter = pendingSubmitter;
        pendingForm = null;
        pendingSubmitter = null;
        dialog.close('confirmed');
        if (!(form instanceof HTMLFormElement)) return;

        confirmedForms.add(form);
        form.requestSubmit(submitter instanceof HTMLButtonElement ? submitter : undefined);
    });
};
