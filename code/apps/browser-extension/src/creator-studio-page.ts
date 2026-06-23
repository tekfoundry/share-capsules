import type { StaticImageMetadataV1 } from '@sharecapsules/capsule-core';

import {
    CreatorStudioSurface,
    parseCreatorStudioDraftV1,
    type CreatorSourcePicker,
    type CreatorStudioRenderer,
    type CreatorStudioViewModel,
    type LocalCreatorSource,
} from './creator-studio.js';
import {
    CreatorSigningKeyRing,
    IndexedDbCreatorSigningKeyStore,
    type CreatorSigningKeySummary,
} from './creator-signing-key.js';
import {
    CreatorSigningKeyRecoveryService,
    parseCreatorSigningKeyRecoveryBundle,
    type CreatorSigningKeyRecoveryBundleV1,
    type CreatorSigningKeyRecoveryMaterials,
} from './creator-signing-key-recovery.js';
import { CREATOR_CONTENT_PROFILE_REGISTRY } from './creator-content-profiles.js';
import type { ContentByteSource } from './creator-content-profile.js';
import {
    createCreatorHostIntegrationV1,
    exampleCapsuleUrlForFilename,
} from './creator-host-integration.js';
import {
    CreatorWorkspaceError,
    creatorWorkspaceNameFromAccountLabel,
    isCreatorWorkspaceName,
    type CreatorWorkspaceStatus,
} from './creator-workspace.js';
import {
    CreatorCapsuleWorkflowError,
    capsuleFilename,
    type CreatorCapsuleWorkflow,
} from './creator-capsule-workflow.js';

export interface BrowserCreatorSource extends LocalCreatorSource, ContentByteSource {
    readonly file: File;
}

export interface CreatorStudioPageOptions {
    readonly picker?: CreatorSourcePicker<BrowserCreatorSource>;
    readonly keyRing?: CreatorSigningKeyRing;
    readonly recoveryService?: CreatorSigningKeyRecoveryService;
    readonly createWorkflow?: (
        surface: CreatorStudioSurface<BrowserCreatorSource, StaticImageMetadataV1>,
        keyRing: CreatorSigningKeyRing,
    ) => Pick<CreatorCapsuleWorkflow, 'buildAndDownload'>;
    readonly connectAccount?: () => Promise<void>;
    readonly isAccountConnected?: () => Promise<boolean>;
    readonly workspaceRecoveryWriter?: CreatorWorkspaceRecoveryWriter;
    readonly workspaceSelector?: CreatorWorkspaceSelector;
    readonly accountLabel?: string;
    readonly instructionsBaseUrl?: string;
}

export interface CreatorWorkspaceRecoveryWriter {
    hasRecoveryBundle(keyId: string): Promise<boolean>;
    saveAndDownload(bundle: CreatorSigningKeyRecoveryBundleV1): Promise<void>;
}

export interface CreatorWorkspaceSelector {
    status(
        keyId: string,
        preferredWorkspaceName?: string,
    ): Promise<CreatorWorkspaceStatus | undefined>;
    choose(keyId: string, workspaceName: string): Promise<CreatorWorkspaceStatus>;
}

export interface CreatorCreationPreparation {
    prepareForCreation(): Promise<
        'ready' | 'confirmation-required' | 'save-location-required' | 'failed'
    >;
}

export async function replacementWorkspaceRecoveryMaterials(
    keyId: string,
    keyRing: Pick<CreatorSigningKeyRing, 'activeSigningKey'>,
    recoveryService: Pick<CreatorSigningKeyRecoveryService, 'create'>,
    workspace: CreatorWorkspaceRecoveryWriter,
): Promise<CreatorSigningKeyRecoveryMaterials | undefined> {
    if (await workspace.hasRecoveryBundle(keyId)) return undefined;
    const key = await keyRing.activeSigningKey();
    if (key.id !== keyId)
        throw new Error('Active signing key changed during recovery preparation.');
    return recoveryService.create(key);
}

export function mountCreatorStudioPage(
    root: HTMLElement,
    draft: unknown,
    options: CreatorStudioPageOptions = {},
): CreatorStudioSurface<BrowserCreatorSource, StaticImageMetadataV1> {
    const parsedDraft = parseCreatorStudioDraftV1(draft);
    const keyRing =
        options.keyRing ?? new CreatorSigningKeyRing(new IndexedDbCreatorSigningKeyStore());
    const surface = new CreatorStudioSurface<BrowserCreatorSource, StaticImageMetadataV1>(
        parsedDraft,
        options.picker ?? new BrowserFilePicker(root.ownerDocument),
        new CreatorStudioPageRenderer(root),
        CREATOR_CONTENT_PROFILE_REGISTRY.resolve('ctx.content.static-image', '1.0'),
    );
    const chooseButton = requiredElement(root, '[data-creator-source-button]', HTMLButtonElement);
    chooseButton.addEventListener('click', () => void surface.chooseSource());
    surface.start();
    const signingKeyPanel = mountCreatorSigningKeyPanel(
        root,
        keyRing,
        options.recoveryService ?? new CreatorSigningKeyRecoveryService(),
        () => setCreatorCreationControlsReady(root),
        options.workspaceRecoveryWriter,
    );
    mountCreatorBuildPanel(
        root,
        options.createWorkflow?.(surface, keyRing),
        parsedDraft.description.title,
        signingKeyPanel,
    );
    setCreatorCreationControlsEnabled(root, false);
    const workspacePanel = mountCreatorWorkspacePanel(
        root,
        keyRing,
        options.workspaceSelector,
        () => {
            setCreatorCreationControlsEnabled(root, false);
            setCreatorBuildStatus(root, 'Checking workspace recovery…');
            void signingKeyPanel.prepareForCreation().then((state) => {
                if (state === 'confirmation-required') {
                    setCreatorBuildStatus(
                        root,
                        'Save and confirm the recovery code above before creating this Capsule.',
                    );
                    return;
                }
                if (state === 'save-location-required') {
                    setCreatorBuildStatus(root, 'Choose the workspace location again to continue.');
                    return;
                }
                if (state !== 'ready') {
                    setCreatorBuildStatus(
                        root,
                        'Recovery could not be prepared. Use the recovery options above.',
                    );
                }
            });
        },
        options.accountLabel,
    );
    mountCreatorAccountPanel(root, options.connectAccount, options.isAccountConnected, () =>
        workspacePanel.prepare(),
    );
    mountCreatorHostIntegrationPanel(
        root,
        parsedDraft.fallback.alt_text,
        options.instructionsBaseUrl,
    );

    return surface;
}

export function mountCreatorWorkspacePanel(
    root: HTMLElement,
    keyRing: Pick<CreatorSigningKeyRing, 'list' | 'generate'>,
    selector?: CreatorWorkspaceSelector,
    onReady: () => void = () => undefined,
    accountLabel = 'share-capsules-account',
): { readonly prepare: () => void } {
    const name = requiredElement(root, '[data-creator-workspace-name]', HTMLInputElement);
    const button = requiredElement(root, '[data-creator-workspace-choose]', HTMLButtonElement);
    const status = requiredElement(root, '[data-creator-workspace-status]', HTMLElement);
    const buildStatus = requiredElement(root, '[data-creator-build-status]', HTMLElement);
    let keyId: string | undefined;
    let preparing = false;

    const showStatus = (workspace: CreatorWorkspaceStatus): void => {
        name.value = workspace.workspaceName;
        if (workspace.writable) {
            button.textContent = 'Change';
            status.textContent = `${workspace.parentName}/share-capsules/${workspace.workspaceName}`;
            onReady();
            return;
        }
        button.textContent = 'Change';
        status.textContent = `share-capsules/${workspace.workspaceName} — choose the parent folder again`;
    };

    const prepare = (): void => {
        if (preparing) return;
        preparing = true;
        setCreatorCreationControlsEnabled(root, false);
        button.disabled = true;
        status.textContent = 'Checking your workspace…';
        buildStatus.textContent = 'Checking your workspace…';
        void ensureActiveCreatorSigningKey(keyRing)
            .then(async (activeKeyId) => {
                keyId = activeKeyId;
                const preferredWorkspaceName = creatorWorkspaceNameFromAccountLabel(accountLabel);
                name.value = preferredWorkspaceName;
                if (selector === undefined) {
                    status.textContent = 'Workspace selection is unavailable in this build.';
                    return;
                }
                const workspace = await selector.status(activeKeyId, preferredWorkspaceName);
                if (workspace === undefined) {
                    button.textContent = 'Choose workspace';
                    status.textContent = `share-capsules/${name.value} — choose parent folder`;
                    buildStatus.textContent =
                        'Choose the workspace location before creating a Capsule.';
                    return;
                }
                showStatus(workspace);
            })
            .catch(() => {
                status.textContent = 'The workspace could not be prepared.';
            })
            .finally(() => {
                preparing = false;
                button.disabled = selector === undefined;
            });
    };

    button.addEventListener('click', () => {
        if (selector === undefined || keyId === undefined || button.disabled) return;
        const workspaceName = name.value.trim();
        if (!isCreatorWorkspaceName(workspaceName)) {
            status.textContent =
                'Use lowercase letters, numbers, and hyphens for the workspace name.';
            return;
        }
        setCreatorCreationControlsEnabled(root, false);
        button.disabled = true;
        status.textContent = 'Choose the folder that will contain share-capsules…';
        buildStatus.textContent = 'Choose the workspace location to continue…';
        void selector
            .choose(keyId, workspaceName)
            .then(showStatus)
            .catch(() => {
                status.textContent = 'The workspace location was not changed.';
                buildStatus.textContent =
                    'Choose the workspace location before creating a Capsule.';
            })
            .finally(() => {
                button.disabled = false;
            });
    });

    return Object.freeze({ prepare });
}

export async function ensureActiveCreatorSigningKey(
    keyRing: Pick<CreatorSigningKeyRing, 'list' | 'generate'>,
): Promise<string> {
    let active = (await keyRing.list()).find((key) => key.status === 'active');
    if (active === undefined) {
        await keyRing.generate();
        active = (await keyRing.list()).find((key) => key.status === 'active');
    }
    if (active === undefined) throw new Error('Creator signing key was not created.');
    return active.id;
}

export type CreatorAccountConnectionState = 'connected' | 'disconnected' | 'check-failed';

export async function checkCreatorAccountConnection(
    isConnected?: () => Promise<boolean>,
): Promise<CreatorAccountConnectionState> {
    if (isConnected === undefined) return 'disconnected';
    try {
        return (await isConnected()) ? 'connected' : 'disconnected';
    } catch {
        return 'check-failed';
    }
}

export async function establishCreatorAccountConnection(
    connect: () => Promise<void>,
    isConnected?: () => Promise<boolean>,
): Promise<'connected' | 'failed'> {
    if ((await checkCreatorAccountConnection(isConnected)) === 'connected') return 'connected';
    try {
        await connect();
        return 'connected';
    } catch {
        return 'failed';
    }
}

export function mountCreatorAccountPanel(
    root: HTMLElement,
    connect?: () => Promise<void>,
    isConnected?: () => Promise<boolean>,
    onConnected: () => void = () => undefined,
): void {
    const button = requiredElement(root, '[data-creator-account-connect]', HTMLButtonElement);
    const status = requiredElement(root, '[data-creator-account-status]', HTMLElement);
    const indicator = requiredElement(root, '[data-creator-account]', HTMLElement);
    if (connect === undefined) {
        button.disabled = true;
        setCreatorCreationControlsEnabled(root, false);
        button.hidden = false;
        indicator.dataset.state = 'error';
        status.textContent = 'Account unavailable';
        return;
    }
    const establish = (): void => {
        button.disabled = true;
        setCreatorCreationControlsEnabled(root, false);
        indicator.dataset.state = 'checking';
        status.textContent = 'Connecting…';
        void establishCreatorAccountConnection(connect, isConnected)
            .then((state) => {
                if (state === 'connected') {
                    button.hidden = true;
                    indicator.dataset.state = 'connected';
                    onConnected();
                    status.textContent = 'Connected';
                    return;
                }
                button.hidden = false;
                button.textContent = 'Retry';
                setCreatorCreationControlsEnabled(root, false);
                indicator.dataset.state = 'error';
                status.textContent = 'Not connected';
            })
            .finally(() => {
                button.disabled = false;
            });
    };
    button.addEventListener('click', establish);
    establish();
}

function setCreatorCreationControlsEnabled(root: HTMLElement, enabled: boolean): void {
    requiredElement(root, '[data-creator-source-button]', HTMLButtonElement).disabled = !enabled;
    requiredElement(root, '[data-creator-build]', HTMLButtonElement).disabled = !enabled;
}

function setCreatorBuildStatus(root: HTMLElement, text: string): void {
    requiredElement(root, '[data-creator-build-status]', HTMLElement).textContent = text;
}

function setCreatorSetupStatus(
    element: HTMLElement,
    text: string,
    state: 'checking' | 'ready' | 'attention' | 'error',
): void {
    element.textContent = text;
    element.dataset.state = state;
}

function setCreatorCreationControlsReady(root: HTMLElement): void {
    setCreatorCreationControlsEnabled(root, true);
    requiredElement(root, '[data-creator-build-status]', HTMLElement).textContent =
        'Ready to create and save your Capsule.';
}

export function mountCreatorBuildPanel(
    root: HTMLElement,
    workflow?: Pick<CreatorCapsuleWorkflow, 'buildAndDownload'>,
    defaultName = 'share-capsule',
    preparation?: CreatorCreationPreparation,
): void {
    const button = requiredElement(root, '[data-creator-build]', HTMLButtonElement);
    const status = requiredElement(root, '[data-creator-build-status]', HTMLElement);
    const name = requiredElement(root, '[data-creator-capsule-name]', HTMLInputElement);
    name.value = capsuleFilename(defaultName);
    if (workflow === undefined) {
        button.disabled = true;
        status.textContent = 'The extension runtime is not connected.';
        return;
    }
    button.disabled = false;
    button.addEventListener('click', () => {
        const filename = name.value.trim();
        if (filename === '') {
            status.textContent = 'Enter a name for the Capsule file.';
            name.focus();
            return;
        }
        name.value = capsuleFilename(filename);
        name.dispatchEvent(new Event('input', { bubbles: true }));
        button.disabled = true;
        status.textContent = 'Preparing your recovery files and saved Capsule…';
        void Promise.resolve(preparation?.prepareForCreation() ?? 'ready')
            .then((state) => {
                if (state === 'confirmation-required') {
                    status.textContent =
                        'Save and confirm the recovery code below, then click Create and save Capsule again.';
                    return undefined;
                }
                if (state === 'save-location-required') {
                    status.textContent =
                        'Choose the save location again, then click Create and save Capsule.';
                    requiredElement(
                        root,
                        '[data-creator-workspace-choose]',
                        HTMLButtonElement,
                    ).focus();
                    return undefined;
                }
                if (state !== 'ready') {
                    status.textContent =
                        'Recovery files could not be prepared. Check the workspace and recovery section above.';
                    return undefined;
                }
                status.textContent = 'Encrypting, signing, verifying, and saving your Capsule…';
                return workflow.buildAndDownload(name.value);
            })
            .then(() => {
                if (status.textContent.startsWith('Encrypting')) {
                    status.textContent = 'Your verified Capsule has been saved.';
                }
            })
            .catch((error: unknown) => {
                status.textContent = creatorBuildErrorMessage(error);
            })
            .finally(() => {
                button.disabled = false;
            });
    });
}

function creatorBuildErrorMessage(error: unknown): string {
    if (!(error instanceof CreatorCapsuleWorkflowError)) {
        return 'The Capsule could not be created. No unverified file was downloaded.';
    }
    return {
        file_required: 'Choose a supported file before creating your Capsule.',
        signing_key_required: 'Create or restore a signing key and save its recovery kit first.',
        session_required: 'Connect this extension to your Share Capsules account first.',
        build_failed: 'The Capsule could not be safely built and verified. Nothing was downloaded.',
        download_failed: 'The Capsule was verified, but the browser could not save it.',
    }[error.code];
}

export function mountCreatorHostIntegrationPanel(
    root: HTMLElement,
    fallbackText: string,
    instructionsBaseUrl = 'https://sharecapsules.com/instructions',
): void {
    const markup = requiredElement(root, '[data-creator-host-markup]', HTMLTextAreaElement);
    const copy = requiredElement(root, '[data-creator-host-copy]', HTMLButtonElement);
    const status = requiredElement(root, '[data-creator-host-status]', HTMLElement);
    const capsuleName = requiredElement(root, '[data-creator-capsule-name]', HTMLInputElement);
    const instructions = requiredElement(
        root,
        '[data-creator-instructions-link]',
        HTMLAnchorElement,
    );
    instructions.href = `${instructionsBaseUrl}#capsule-hosting`;

    const update = (): void => {
        try {
            const integration = createCreatorHostIntegrationV1({
                capsuleUrl: exampleCapsuleUrlForFilename(capsuleFilename(capsuleName.value)),
                fallbackText,
            });
            markup.value = integration.markup;
            copy.disabled = false;
            status.textContent = 'Replace example.com with your real website when you publish.';
        } catch {
            markup.value = '';
            copy.disabled = true;
            status.textContent = 'Enter a valid Capsule file name to see example markup.';
        }
    };
    capsuleName.addEventListener('input', update);
    copy.addEventListener('click', () => {
        if (copy.disabled || markup.value === '') return;
        const clipboard = root.ownerDocument.defaultView?.navigator.clipboard;
        if (clipboard === undefined) {
            selectMarkup(markup, status);
            return;
        }
        void clipboard
            .writeText(markup.value)
            .then(() => {
                status.textContent = 'Markup copied.';
            })
            .catch(() => {
                selectMarkup(markup, status);
            });
    });
    update();
}

function selectMarkup(markup: HTMLTextAreaElement, status: HTMLElement): void {
    markup.focus();
    markup.select();
    status.textContent = 'The markup is selected. Copy it with your keyboard.';
}

export function mountCreatorSigningKeyPanel(
    root: HTMLElement,
    keyRing: CreatorSigningKeyRing = new CreatorSigningKeyRing(
        new IndexedDbCreatorSigningKeyStore(),
    ),
    recoveryService: CreatorSigningKeyRecoveryService = new CreatorSigningKeyRecoveryService(),
    onReady: () => void = () => undefined,
    workspaceRecoveryWriter?: CreatorWorkspaceRecoveryWriter,
): CreatorCreationPreparation {
    const button = requiredElement(root, '[data-creator-signing-key-button]', HTMLButtonElement);
    const status = requiredElement(root, '[data-creator-signing-key-status]', HTMLElement);
    const list = requiredElement(root, '[data-creator-signing-key-list]', HTMLUListElement);
    const recoveryButton = requiredElement(
        root,
        '[data-creator-recovery-create]',
        HTMLButtonElement,
    );
    const recoveryPanel = requiredElement(root, '[data-creator-recovery-panel]', HTMLElement);
    const recoveryCode = requiredElement(root, '[data-creator-recovery-code]', HTMLElement);
    const buildStatus = requiredElement(root, '[data-creator-build-status]', HTMLElement);
    const bundleSaved = requiredElement(
        root,
        '[data-creator-recovery-bundle-saved]',
        HTMLInputElement,
    );
    const codeSaved = requiredElement(root, '[data-creator-recovery-code-saved]', HTMLInputElement);
    const confirmButton = requiredElement(
        root,
        '[data-creator-recovery-confirm]',
        HTMLButtonElement,
    );
    const restoreBundle = requiredElement(root, '[data-creator-recovery-file]', HTMLInputElement);
    const restoreCode = requiredElement(
        root,
        '[data-creator-recovery-restore-code]',
        HTMLInputElement,
    );
    const restoreButton = requiredElement(
        root,
        '[data-creator-recovery-restore]',
        HTMLButtonElement,
    );
    const restoreDetails = restoreButton.closest('details');
    if (!(restoreDetails instanceof HTMLDetailsElement)) {
        throw new Error('Creator Studio is missing recovery restore details.');
    }
    let recoveryMaterials: CreatorSigningKeyRecoveryMaterials | undefined;
    let recoveryKeyId: string | undefined;
    let preparationRequested = false;
    let preparing = false;

    const render = (keys: readonly CreatorSigningKeySummary[]): void => {
        list.replaceChildren(
            ...keys.map((key) => {
                const item = root.ownerDocument.createElement('li');
                const label = root.ownerDocument.createElement('strong');
                label.textContent = key.status === 'active' ? 'Active signing key' : 'Previous key';
                const detail = root.ownerDocument.createElement('span');
                const recovery =
                    key.recoveryStatus === 'confirmed'
                        ? 'recovery kit saved'
                        : 'recovery kit needed';
                detail.textContent = `${key.id} · ${key.status} · ${recovery}`;
                item.append(label, detail);
                return item;
            }),
        );
        setCreatorSetupStatus(
            status,
            keys.some((key) => key.status === 'active') ? 'Signing key ready' : 'Key needed',
            keys.some((key) => key.status === 'active') ? 'checking' : 'attention',
        );
        button.textContent = keys.length === 0 ? 'Create signing key' : 'Create replacement key';
        button.disabled = false;
        const active = keys.find((key) => key.status === 'active');
        recoveryButton.hidden = active === undefined || active.recoveryStatus === 'confirmed';
        recoveryButton.disabled = active === undefined;
        if (active?.recoveryStatus === 'confirmed') {
            recoveryPanel.hidden = true;
            setCreatorSetupStatus(status, 'Recovery ready', 'ready');
            if (preparationRequested) {
                buildStatus.textContent = 'Ready to create and save your Capsule.';
                onReady();
            }
        }
    };

    const refresh = async (): Promise<void> => render(await keyRing.list());
    const saveRecoveryBundle = async (bundle: CreatorSigningKeyRecoveryBundleV1): Promise<void> => {
        if (workspaceRecoveryWriter !== undefined) {
            await workspaceRecoveryWriter.saveAndDownload(bundle);
            return;
        }
        downloadRecoveryBundle(root.ownerDocument, bundle.key.id, bundle);
    };
    const showRecoveryMaterials = async (
        keyId: string,
        materials: CreatorSigningKeyRecoveryMaterials,
    ): Promise<void> => {
        await saveRecoveryBundle(materials.bundle);
        recoveryMaterials = materials;
        recoveryKeyId = keyId;
        recoveryCode.textContent = materials.recoveryCode;
        bundleSaved.checked = false;
        codeSaved.checked = false;
        confirmButton.disabled = true;
        recoveryPanel.hidden = false;
        setCreatorSetupStatus(status, 'Save recovery code', 'attention');
        buildStatus.textContent =
            'One-time setup: save and confirm the recovery code below before creating this Capsule.';
    };
    const createRecoveryMaterials = async (): Promise<void> => {
        const key = await keyRing.activeSigningKey();
        await showRecoveryMaterials(key.id, await recoveryService.create(key));
    };
    const prepareForCreation = async (): Promise<
        'ready' | 'confirmation-required' | 'save-location-required' | 'failed'
    > => {
        if (preparing) return 'failed';
        preparing = true;
        preparationRequested = true;
        button.disabled = true;
        recoveryButton.disabled = true;
        setCreatorSetupStatus(status, 'Checking recovery…', 'checking');
        try {
            const result = await prepareCreatorSigningRecovery(keyRing, recoveryService);
            if (result.status === 'ready') {
                if (workspaceRecoveryWriter !== undefined) {
                    const replacement = await replacementWorkspaceRecoveryMaterials(
                        result.keyId,
                        keyRing,
                        recoveryService,
                        workspaceRecoveryWriter,
                    );
                    if (replacement !== undefined) {
                        await showRecoveryMaterials(result.keyId, replacement);
                        recoveryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        return 'confirmation-required';
                    }
                }
                await refresh();
                return 'ready';
            }
            await showRecoveryMaterials(result.keyId, result.materials);
            recoveryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return 'confirmation-required';
        } catch (error) {
            if (
                error instanceof CreatorWorkspaceError &&
                ['invalid_selection', 'permission_required', 'write_failed'].includes(error.code)
            ) {
                setCreatorSetupStatus(status, 'Workspace needed', 'attention');
                return 'save-location-required';
            }
            restoreDetails.open = true;
            setCreatorSetupStatus(status, 'Recovery needs help', 'error');
            return 'failed';
        } finally {
            preparing = false;
            button.disabled = false;
            recoveryButton.disabled = false;
        }
    };
    button.addEventListener('click', () => {
        button.disabled = true;
        setCreatorSetupStatus(status, 'Creating key…', 'checking');
        void keyRing
            .generate()
            .then(refresh)
            .catch(() => {
                setCreatorSetupStatus(status, 'Key failed', 'error');
            })
            .finally(() => {
                button.disabled = false;
            });
    });
    recoveryButton.addEventListener('click', () => {
        recoveryButton.disabled = true;
        setCreatorSetupStatus(status, 'Creating recovery…', 'checking');
        void createRecoveryMaterials()
            .catch(() => {
                setCreatorSetupStatus(status, 'Recovery failed', 'error');
            })
            .finally(() => {
                recoveryButton.disabled = false;
            });
    });
    const updateConfirmation = (): void => {
        confirmButton.disabled =
            recoveryMaterials === undefined || !bundleSaved.checked || !codeSaved.checked;
    };
    bundleSaved.addEventListener('change', updateConfirmation);
    codeSaved.addEventListener('change', updateConfirmation);
    confirmButton.addEventListener('click', () => {
        if (recoveryKeyId === undefined || confirmButton.disabled) return;
        confirmButton.disabled = true;
        void keyRing
            .confirmRecoverySaved(recoveryKeyId)
            .then(() => {
                recoveryMaterials = undefined;
                recoveryKeyId = undefined;
                recoveryCode.textContent = '';
                return refresh();
            })
            .catch(() => {
                setCreatorSetupStatus(status, 'Confirm failed', 'error');
                updateConfirmation();
            });
    });
    restoreButton.addEventListener('click', () => {
        const file = restoreBundle.files?.item(0);
        if (file === null || file === undefined || restoreCode.value === '') {
            setCreatorSetupStatus(status, 'Restore info needed', 'attention');
            return;
        }
        restoreButton.disabled = true;
        setCreatorSetupStatus(status, 'Restoring key…', 'checking');
        void readRecoveryBundle(file)
            .then(async (bundle) => ({
                bundle,
                recovered: await recoveryService.recover(bundle, restoreCode.value),
            }))
            .then(async ({ bundle, recovered }) => {
                const active = (await keyRing.list()).find((key) => key.status === 'active');
                if (active === undefined || active.id !== recovered.id) {
                    await keyRing.restore(recovered);
                } else if (active.publicKey !== recovered.publicKey) {
                    throw new Error('The recovery key does not match the active signing key.');
                }
                await saveRecoveryBundle(bundle);
            })
            .then(() => {
                restoreCode.value = '';
                restoreBundle.value = '';
                return refresh();
            })
            .catch(() => {
                setCreatorSetupStatus(status, 'Restore failed', 'error');
            })
            .finally(() => {
                restoreButton.disabled = false;
            });
    });
    void refresh().catch(() => {
        setCreatorSetupStatus(status, 'Key unavailable', 'error');
        button.disabled = true;
    });

    return Object.freeze({ prepareForCreation });
}

export async function prepareCreatorSigningRecovery(
    keyRing: Pick<CreatorSigningKeyRing, 'list' | 'generate' | 'activeSigningKey'>,
    recoveryService: Pick<CreatorSigningKeyRecoveryService, 'create'>,
): Promise<
    | { readonly status: 'ready'; readonly keyId: string }
    | {
          readonly status: 'save-required';
          readonly keyId: string;
          readonly materials: CreatorSigningKeyRecoveryMaterials;
      }
> {
    let active = (await keyRing.list()).find((key) => key.status === 'active');
    if (active?.recoveryStatus === 'confirmed') return { status: 'ready', keyId: active.id };
    if (active === undefined) {
        await keyRing.generate();
        active = (await keyRing.list()).find((key) => key.status === 'active');
    }
    if (active === undefined) throw new Error('Creator signing key was not created.');
    const key = await keyRing.activeSigningKey();
    return {
        status: 'save-required',
        keyId: key.id,
        materials: await recoveryService.create(key),
    };
}

async function readRecoveryBundle(file: File): Promise<CreatorSigningKeyRecoveryBundleV1> {
    if (file.size < 1 || file.size > 16_384) throw new Error('Invalid recovery bundle size.');
    return parseCreatorSigningKeyRecoveryBundle(JSON.parse(await file.text()) as unknown);
}

function downloadRecoveryBundle(
    document: Document,
    keyId: string,
    bundle: CreatorSigningKeyRecoveryBundleV1,
): void {
    const view = document.defaultView;
    if (view === null) throw new Error('Creator Studio does not have a browser window.');
    const blob = new Blob([JSON.stringify(bundle, undefined, 2)], {
        type: 'application/json',
    });
    const url = view.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${keyId}.sharecapsules-recovery.json`;
    link.click();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
}

class BrowserFilePicker implements CreatorSourcePicker<BrowserCreatorSource> {
    public constructor(private readonly document: Document) {}

    public choose(): Promise<BrowserCreatorSource | undefined> {
        return new Promise((resolve) => {
            const input = this.document.createElement('input');
            input.type = 'file';
            input.accept = 'image/jpeg,image/png,image/webp';
            let settled = false;
            const finish = (source: BrowserCreatorSource | undefined): void => {
                if (settled) return;
                settled = true;
                resolve(source);
            };
            input.addEventListener(
                'change',
                () => {
                    const file = input.files?.item(0);
                    finish(
                        file === null || file === undefined
                            ? undefined
                            : {
                                  name: file.name,
                                  size: file.size,
                                  mediaType: file.type,
                                  file,
                                  read: async () => new Uint8Array(await file.arrayBuffer()),
                              },
                    );
                },
                { once: true },
            );
            input.addEventListener('cancel', () => finish(undefined), { once: true });
            input.click();
        });
    }
}

class CreatorStudioPageRenderer implements CreatorStudioRenderer {
    public constructor(private readonly root: HTMLElement) {}

    public render(model: CreatorStudioViewModel): void {
        setText(this.root, '[data-creator-title]', model.title);
        setText(
            this.root,
            '[data-creator-description]',
            model.description ?? 'No description provided',
        );
        setText(this.root, '[data-creator-access]', model.accessSummary);
        setText(this.root, '[data-creator-total-limit]', model.totalLimitSummary);
        setText(this.root, '[data-creator-account-limit]', model.accountLimitSummary);
        setText(this.root, '[data-creator-automation-risk]', model.automationRiskSummary);
        setText(
            this.root,
            '[data-creator-selected-file]',
            model.sourceIssue ??
                (model.selectedFile === undefined
                    ? model.status === 'validating-file'
                        ? 'Checking the selected file…'
                        : 'No valid file selected'
                    : `${model.selectedFile.name} (${formatFileSize(model.selectedFile.size)})`),
        );

        const chooseButton = requiredElement(
            this.root,
            '[data-creator-source-button]',
            HTMLButtonElement,
        );
        chooseButton.disabled =
            model.status === 'choosing-file' || model.status === 'validating-file';
        chooseButton.textContent =
            model.status === 'choosing-file'
                ? 'Choosing…'
                : model.status === 'validating-file'
                  ? 'Checking…'
                  : 'Choose a file';
    }
}

function setText(root: HTMLElement, selector: string, value: string): void {
    requiredElement(root, selector, HTMLElement).textContent = value;
}

function requiredElement<T extends typeof Element>(
    root: HTMLElement,
    selector: string,
    constructor: T,
): InstanceType<T> {
    const element = root.querySelector(selector);
    if (!(element instanceof constructor)) {
        throw new Error(`Creator Studio is missing ${selector}.`);
    }

    return element as InstanceType<T>;
}

function formatFileSize(bytes: number): string {
    return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
        style: 'unit',
        unit: 'megabyte',
        unitDisplay: 'short',
    }).format(bytes / 1_000_000);
}
