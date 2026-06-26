import {
    InvalidDomainError,
    NotSupportedError,
    PasskeyExistsError,
    Passkeys,
    UserCancelledError,
} from '@laravel/passkeys';
import { initializeCapsuleCreatorHandoff } from './creator-studio.js';
import { initializeConfirmationDialogs } from './confirmation-dialog.js';
import { initializeDisclosurePopovers } from './disclosure-popovers.js';

const messageFor = (error) => {
    if (error instanceof NotSupportedError) return 'This browser does not support passkeys.';
    if (error instanceof UserCancelledError) return 'The passkey request was cancelled.';
    if (error instanceof PasskeyExistsError) return 'That passkey is already enrolled.';
    if (error instanceof InvalidDomainError)
        return 'Passkeys are unavailable for this site address.';

    return 'The passkey request could not be completed. Please try again.';
};

const setStatus = (container, message, isError = false) => {
    const status = container.querySelector('[data-passkey-status]');
    if (!status) return;

    status.textContent = message;
    status.classList.remove('hidden', 'text-muted', 'text-red-700');
    status.classList.add(isError ? 'text-red-700' : 'text-muted');
};

const withBusyButton = async (button, action) => {
    button.disabled = true;

    try {
        await action();
    } finally {
        button.disabled = false;
    }
};

const initializePasskeyLogin = () => {
    const button = document.querySelector('[data-passkey-login]');
    if (!(button instanceof HTMLButtonElement)) return;

    const container = button.closest('[data-passkey-container]');
    if (!(container instanceof HTMLElement)) return;

    if (!Passkeys.isSupported()) {
        button.disabled = true;
        setStatus(container, 'Passkeys are not supported by this browser.');
        return;
    }

    button.addEventListener('click', () => {
        withBusyButton(button, async () => {
            setStatus(container, 'Waiting for your passkey…');

            try {
                const response = await Passkeys.verify();
                window.location.assign(response.redirect ?? '/dashboard');
            } catch (error) {
                setStatus(container, messageFor(error), true);
            }
        });
    });
};

const initializePasskeyConfirmation = () => {
    const button = document.querySelector('[data-passkey-confirm]');
    if (!(button instanceof HTMLButtonElement)) return;

    const container = button.closest('[data-passkey-container]');
    if (!(container instanceof HTMLElement)) return;

    if (!Passkeys.isSupported()) {
        button.disabled = true;
        setStatus(container, 'Passkeys are not supported by this browser.');
        return;
    }

    button.addEventListener('click', () => {
        withBusyButton(button, async () => {
            setStatus(container, 'Waiting for your passkey…');

            try {
                const response = await Passkeys.verify({
                    routes: {
                        options: '/passkeys/confirm/options',
                        submit: '/passkeys/confirm',
                    },
                });
                window.location.assign(response.redirect ?? '/dashboard');
            } catch (error) {
                setStatus(container, messageFor(error), true);
            }
        });
    });
};

const initializePasskeyRegistration = () => {
    const form = document.querySelector('[data-passkey-register]');
    if (!(form instanceof HTMLFormElement)) return;

    const container = form.closest('[data-passkey-container]');
    const button = form.querySelector('button[type="submit"]');
    const name = form.querySelector('input[name="passkey_name"]');
    if (
        !(container instanceof HTMLElement) ||
        !(button instanceof HTMLButtonElement) ||
        !(name instanceof HTMLInputElement)
    )
        return;

    if (!Passkeys.isSupported()) {
        button.disabled = true;
        setStatus(container, 'Passkeys are not supported by this browser.');
        return;
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        withBusyButton(button, async () => {
            const passkeyName = name.value.trim();
            if (!passkeyName) {
                setStatus(container, 'Enter a name for this passkey.', true);
                return;
            }

            setStatus(container, 'Waiting for your authenticator…');

            try {
                await Passkeys.register({ name: passkeyName });
                window.location.reload();
            } catch (error) {
                setStatus(container, messageFor(error), true);
            }
        });
    });
};

initializePasskeyLogin();
initializePasskeyConfirmation();
initializePasskeyRegistration();
initializeCapsuleCreatorHandoff();
initializeConfirmationDialogs();
initializeDisclosurePopovers();
