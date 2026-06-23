# Phase 7 Creator runtime manual test

This is the manual acceptance gate for the first Phase 7 task. Complete it only after the automated extension build and full repository gate pass. Do not treat Creator creation as user-viable until every result below is recorded.

The development extension identity is `dhconceamghcnndjodjhjikknblhkmej`. It is intentionally distinct from the future production Web Store identity. Never replace the production identity or OAuth callback with this development value.

## Prepare the local services and extension

From the repository root:

```bash
./_infra/kit up
./_infra/kit broker up
./_infra/kit npm run build:extension
./_infra/kit artisan ctx:provision-extension-client
```

If your prompt is already inside the `_infra` directory, use the equivalent commands below instead:

```bash
./kit up
./kit broker up
./kit npm run build:extension
./kit artisan ctx:provision-extension-client
```

Do not run `npm run build:extension` directly from `_infra`; that directory does not contain the application's `package.json`.

`broker up` starts the isolated local broker profile and applies its pending migrations. It does not deploy or change production.

In Chrome or Chromium:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `code/apps/browser-extension/build`.
5. Confirm the displayed extension ID is exactly `dhconceamghcnndjodjhjikknblhkmej`. Stop if it differs.

After rebuilding an extension that is already loaded, return to `chrome://extensions` and choose **Reload** on its card before repeating the test.

## Create the first Capsule and recovery kit

1. Sign in to the local Share Capsules site and open `/studio/capsules/create`.
2. Enter a title and optional description. Leave automation protection off for this local exercise.
3. Choose **Continue in the extension** and confirm a single extension-owned Creator Studio tab opens.
4. Confirm account connection completes automatically. If authorization is required, confirm it occurs on the Share Capsules site and no password field appears in the extension page.
5. Confirm the muted **Workspace and recovery** area appears before the main Capsule creation area. If no remembered writable workspace exists, choose the parent directory and confirm the extension shows `share-capsules/<account-folder>/` as the save location. The account folder should be based on the signed-in account label, such as an email normalized for filesystem safety.
6. Confirm the extension prepares `workspace.json` and the encrypted recovery file under `recovery/` before the main creation controls become ready. On first use or after changing to an empty workspace, save the separate recovery code somewhere outside that workspace and confirm both recovery items are saved.
7. Confirm the main creation area contains the signed Capsule details, **Choose a file**, Capsule filename, and **Create and save Capsule** action. Choose one supported static JPEG, PNG, or WebP.
8. Confirm the Capsule file name defaults from the public Title, change it if desired, then choose **Create and save Capsule**.
9. Confirm that exact normalized `.capsule` filename appears under `share-capsules/<account-folder>/capsules/`; retain that first file.
10. Confirm `workspace.json` and the encrypted recovery file are still present and were not renamed with duplicate-number suffixes.
11. Confirm the Capsule appears in the Creator inventory as active.
12. Choose a different parent directory, create another Capsule, and confirm the new location receives `workspace.json` and the matching encrypted recovery file before the Capsule is written.

## Restore and prove the signing identity

This test intentionally clears development-extension state. It does not delete the Share Capsules account or the downloaded recovery materials.

1. In `chrome://extensions`, open the development extension details and clear its site/extension data, or remove and reload the unpacked extension.
2. Return to `/studio/capsules/create`, prepare a second draft, and continue into the extension.
3. Reconnect the account.
4. Under **Restore an existing signing key**, choose the saved recovery file and enter the separate recovery code.
5. Choose another supported image and create a second Capsule.
6. Inspect both manifests without extracting their payloads:

```bash
unzip -p /path/to/first.capsule manifest.json
unzip -p /path/to/second.capsule manifest.json
```

7. Confirm both manifests contain the same `creator.signing_key.id` and `creator.signing_key.public_key`.
8. Confirm changing one character of the recovery code causes restoration to fail without creating a key.

## Expected privacy and failure behavior

- The Laravel page never receives the selected source bytes, content key, signing private key, or recovery code.
- No Capsule download occurs before exact local archive verification and successful broker finalization.
- Cancelling or failing the browser download cancels the registered key instead of leaving a usable orphan.
- Reusing the one-time Creator handoff URL shows an unavailable request rather than replaying the draft.
- The Host integration markup contains only the public Capsule URL and public fallback text.

Record the browser/version, extension ID, two Capsule filenames, matching signing-key ID, and pass/fail result. Do not record the recovery code, private material, access tokens, or content keys.
