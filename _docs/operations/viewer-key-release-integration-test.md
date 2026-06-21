# Viewer Key-Release Integration Test

This is a deferred end-to-end acceptance test for the real Viewer extension/runtime seams that unit and feature tests intentionally replace with fakes. It is not a Phase 5 completion gate.

## Current status

The gate cannot yet be completed. `code/apps/browser-extension` currently contains tested TypeScript libraries for OAuth, DPoP, and Viewer-device registration, but it is not a loadable browser extension. It has no extension `manifest.json`, background worker, content script, extension-controlled UI, or browser-loadable build output. Local configuration also still uses `SHARECAPSULES_EXTENSION_ID=development-not-configured`.

Do not attempt to load `code/apps/browser-extension/dist` through `chrome://extensions`; it is a library build, not an unpacked extension. Resume this document after the Viewer extension shell and a stable development extension identity are implemented. Until then, Phase 5 is verified by its automated cross-language vectors, provider tests, broker tests, and isolated runtime smoke checks.

## Preconditions

- Start the normal local app and the isolated broker with `./_infra/kit broker up`.
- Apply the normal Laravel migrations.
- Stage and activate one local CTX ticket-signing key using the steps below.
- Load the unpacked Viewer extension using the configured development extension identity.
- Connect a verified account and register the installation's Ed25519 proof key and X25519 agreement key.

### Stage and activate a local ticket-signing key

From the repository root:

```bash
./_infra/kit artisan ctx:ticket-signing-key stage
```

The command reports a `kid`. Its final period is sentence punctuation and is not part of the identifier. Activate the key without that period:

```bash
./_infra/kit artisan ctx:ticket-signing-key activate <kid>
```

Verify that the activated key is published:

```bash
curl http://localhost:3003/ctx/jwks.json
```

The response must contain the same `kid` with `kty: "OKP"`, `crv: "Ed25519"`, `use: "sig"`, and `alg: "EdDSA"`.

## Exercise

1. Generate one 32-byte content key in the extension; never paste it into Laravel, logs, or this record.
2. Request a `capsule:create` registration grant for a test Capsule, revision, policy digest, and payload.
3. Register the key directly with the broker and retain the returned opaque handle in the local test fixture only.
4. Request CTX authorization with explicit view-event consent and confirm the returned ticket has a 60-second signed lifetime and no `sub` or account identifier.
5. Create a fresh `ctx-key-release-proof+jwt`, call the broker, and independently HPKE-open the response using the installation's X25519 private key.
6. Confirm the recovered 32 bytes exactly equal the locally generated key and that no plaintext key appears in either runtime's logs or databases.
7. Replay the same ticket and proof. Confirm rejection and confirm both committed-release counters remain exactly one.
8. Issue a ticket but do not redeem it. Confirm neither counter changes after expiry.
9. Repeat with a lifetime maximum already reached. Confirm the broker returns no wrapped key and neither counter exceeds the maximum.

## Record

Record only date, tester, browser/extension build identifier, pass/fail for each step, and sanitized defect references. Never record tickets, proofs, content keys, private keys, tokens, or credential values.
