# Chrome Web Store Production Identity

Captured: 2026-06-27

This file records the non-secret Chrome Web Store identity values for the Share Capsules production extension. These values are safe to keep in the repository because the extension ID and public key are public identifiers.

Do not add OAuth client secrets, API keys, private keys, refresh tokens, or account credentials to this file. Put secrets only in the appropriate production secret manager or ignored local environment files.

## Item

- Chrome Web Store item URL: `https://chrome.google.com/u/1/webstore/devconsole/eae1413a-7a34-488d-9f33-128fe7a6235f/jkejpdcobbbeichpodpeoiilnalepdph/edit/package`
- Public Chrome Web Store listing URL: `https://chromewebstore.google.com/detail/share-capsules/jkejpdcobbbeichpodpeoiilnalepdph`
- Chrome Web Store item UUID: `eae1413a-7a34-488d-9f33-128fe7a6235f`
- Chrome extension ID: `jkejpdcobbbeichpodpeoiilnalepdph`

## Public Key

PEM form:

```text
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnL9kcyXka6oRRsM9/M8h
kqOSzogFe7xDoV0wOAUC5706YjuFCQQ7Yl379UCjwSdj0D1dXAx4QkJafUsrfOQx
5xubCIWjo3C26axT0oLhO8Jue0rV2B8mamrg6fIv3+nSIHMy+ZsOvSKE2rZF/bFb
QcbtdtnWDXv2XCLI4dwNxCswPNvtRruYqKz34WpOwVBt75wcnU7sAHrOCIHlODX1
hIqIMNouaNWQtlQ756pkoRzp0Ol+wClDHQsFOWY6D3kjU1iB+JzDsFn68Ts0pNoS
xh30Y0WtwV4/2hhHQEk1TfL4FZVuJsPIbaNhZ7WZZPCi+VwUQThKSteT78BIhZ8t
twIDAQAB
-----END PUBLIC KEY-----
```

Single-line base64 form for extension builds:

```text
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnL9kcyXka6oRRsM9/M8hkqOSzogFe7xDoV0wOAUC5706YjuFCQQ7Yl379UCjwSdj0D1dXAx4QkJafUsrfOQx5xubCIWjo3C26axT0oLhO8Jue0rV2B8mamrg6fIv3+nSIHMy+ZsOvSKE2rZF/bFbQcbtdtnWDXv2XCLI4dwNxCswPNvtRruYqKz34WpOwVBt75wcnU7sAHrOCIHlODX1hIqIMNouaNWQtlQ756pkoRzp0Ol+wClDHQsFOWY6D3kjU1iB+JzDsFn68Ts0pNoSxh30Y0WtwV4/2hhHQEk1TfL4FZVuJsPIbaNhZ7WZZPCi+VwUQThKSteT78BIhZ8ttwIDAQAB
```

Verified derived extension ID:

```text
jkejpdcobbbeichpodpeoiilnalepdph
```

## Production Build Inputs

Use these values when building the final production extension ZIP:

```text
SHARECAPSULES_EXTENSION_ID=jkejpdcobbbeichpodpeoiilnalepdph
SHARECAPSULES_EXTENSION_PUBLIC_KEY=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnL9kcyXka6oRRsM9/M8hkqOSzogFe7xDoV0wOAUC5706YjuFCQQ7Yl379UCjwSdj0D1dXAx4QkJafUsrfOQx5xubCIWjo3C26axT0oLhO8Jue0rV2B8mamrg6fIv3+nSIHMy+ZsOvSKE2rZF/bFbQcbtdtnWDXv2XCLI4dwNxCswPNvtRruYqKz34WpOwVBt75wcnU7sAHrOCIHlODX1hIqIMNouaNWQtlQ756pkoRzp0Ol+wClDHQsFOWY6D3kjU1iB+JzDsFn68Ts0pNoSxh30Y0WtwV4/2hhHQEk1TfL4FZVuJsPIbaNhZ7WZZPCi+VwUQThKSteT78BIhZ8ttwIDAQAB
SHARECAPSULES_OAUTH_EXTENSION_CLIENT_ID=418997f0-d3bd-4f91-811b-3352a006220f
SHARECAPSULES_OAUTH_EXTENSION_REDIRECT_URI=https://jkejpdcobbbeichpodpeoiilnalepdph.chromiumapp.org/oauth/callback
```

The OAuth extension client ID is a public fixed client identifier. Use the same value in the production Forge environment before running `php artisan ctx:provision-extension-client`.

Do not record any OAuth client secret in this document. The extension OAuth client is a public client and should not have a client secret.

## Package Uploads

- 2026-07-27: Uploaded draft package `share-capsules-extension-0.1.0-production-2026-07-27.zip` to the existing reserved Chrome Web Store item. SHA-256: `fdf7bef48f8a7c4ea90f3c9e975f8146b76354f84cf30f79a6c26eed4051c492`.
- 2026-07-28: Submitted the draft package for Chrome Web Store review after production smoke, OAuth, Capsule creation, broker release, Viewer rendering, pause/resume, device suspend/reactivate, scheduler, queue, backup, and uptime-monitoring evidence. The dashboard showed status `Pending review` for extension ID `jkejpdcobbbeichpodpeoiilnalepdph`. Automatic publishing after approval was intentionally left enabled for this MVP submission.
- 2026-07-29: Chrome Web Store review passed and the draft automatically published publicly. The dashboard showed status `Published - public` for extension ID `jkejpdcobbbeichpodpeoiilnalepdph`.
- 2026-07-29: The Chrome Web Store-installed extension was reconnected and verified against `https://sharecapsules.com/phase12/capsule-test`; the protected TekFoundry logo rendered successfully.
- 2026-07-29: The public listing URL returned HTTP `200`.
