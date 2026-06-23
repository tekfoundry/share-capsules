# Accounts and Identity

Status: Draft
Last updated: 2026-06-22

## Purpose

Define the current V1 intent for Share Capsules account creation, authentication, device registration, and optional identity assurance.

## Share Capsules account

Creators and viewers use the same underlying Share Capsules account. Creator and viewer are roles and capabilities associated with that account rather than separate account types.

Creating an account requires:

- Email address
- Password
- Acceptance of current account and privacy terms

The service stores the acceptance timestamp and server-selected terms version; it does not trust a client to declare which version was accepted. V1 registration does not require a display name or public profile.

The email address must be verified before the account can create Capsules, build shareable reputation, register trusted devices, or access protected content. Email verification proves control of the address; it does not prove identity, personhood, or trustworthiness.

## Account continuity, not unique personhood

V1 treats a Share Capsules account as a persistent continuity boundary. It does not claim or enforce one-human-one-account. Email addresses, passwords, passkeys, and Viewer device keys can all be created or replaced and therefore cannot establish unique personhood.

V1 raises the cost of disposable replacement through verified email, signup and account-creation abuse limits, registered-device and account continuity, automation-risk checks, sanctions, and reputation that takes time to establish. These controls reduce easy resets but cannot prevent a determined person or organization from creating another account.

Accounts are closable and deletable. Making an account permanent would not prevent reputation resets because a user could abandon it and create another account. Closure immediately disables authentication, sessions, registered devices, Capsule creation, and further CTX authorization. The account enters a 30-day recovery period during which the owner may restore it through the defined secure recovery flow. The account cannot create Capsules or authorize key releases while closure is pending.

Share Capsules does not transfer Capsule ownership, release handles, signing authority, trust history, or reputation between accounts in V1. A creator who wants another person to republish content provides the unencrypted original through an external, mutually chosen channel. The recipient creates a wholly independent Capsule using their own account, signing key, policy, Capsule identifier, and broker release handle. CTX makes no provenance or ownership claim about that offline exchange.

Before permanent deletion, Share Capsules uses the durable creator-owned Capsule registry to warn the creator which revisions will stop working and allows them to download that inventory. Registration grants, tickets, metrics, and counters are not inventory sources. When the 30-day period expires, every registry-bound release handle is driven through retryable broker destruction before local personal data is erased. Hosted `.capsule` files remain wherever the creator placed them, but Share Capsules can no longer authorize their decryption. Deletion-ledger replay uses the retained internal account obligation to reapply destruction after backup restoration; it does not infer handles from expiring protocol artifacts. Permanent deletion then removes the account's personal data and detailed trust profile subject only to narrowly justified, purpose-bound retention.

A replacement account starts without the deleted account's reputation, continuity, registered-device history, or per-account Capsule counters. It does not inherit either favorable or unfavorable standing. Capsule-global counters survive account deletion because they measure releases against the creator's Capsule rather than the viewer account.

Ordinary account deletion leaves no account-level abuse tombstone. If the account is subject to an active security or abuse sanction when deletion completes, V1 may retain a restricted sanction tombstone for no more than 90 days from deletion. It contains only a keyed HMAC of the normalized verified email address, the sanction category, imposed and expiry timestamps, and an appeal reference. It contains no raw email address, viewing history, per-account counters, device fingerprint, credential, or trust profile.

The tombstone exists only to enforce the still-active sanction and support correction or appeal. It is deleted immediately if the sanction is reversed and no later than its 90-day maximum. Access is limited to the signup-abuse check and authorized security or appeal personnel; it must not support advertising, general reputation, creator disclosure, or account reconstruction. A different email may evade this modest V1 control, and the product must not present it as duplicate-person detection.

V1 recognizes only the coarse `automation_abuse`, `account_abuse`, and `security_abuse` sanction categories. The categories are intentionally not free-form narratives. The email comparison uses a dedicated, deployment-specific 32-byte HMAC-SHA-256 key over the trimmed, lowercase verified address and stores only the binary digest. Production deployment validation rejects missing, placeholder, or incorrectly sized keys. The key must remain stable for the tombstone's bounded lifetime and must not be reused as a general application-encryption secret.

At permanent deletion, an account-level transaction creates a tombstone only for sanctions that are unreversed and unexpired. `retain_until` is the earlier of sanction expiry and 90 days after deletion. Reversal by appeal reference deletes the tombstone immediately; an hourly pruning job removes records at their retention boundary. Registration checks only active tombstones for the normalized candidate email. It creates no link between old and replacement accounts, and registration with another email remains possible.

Deleted account data may remain in encrypted disaster-recovery backups for no more than 30 additional days after permanent deletion. Backups are not searchable, available to normal application paths, or used for analytics, policy evaluation, sanction enforcement, or account reconstruction. A durable deletion ledger records the minimum identifiers needed to reapply deletions before any restored backup is returned to service. The ledger itself must not preserve deleted profile or activity data.

The V1 ledger is stored through a dedicated database connection that production must isolate from normal application backups. Each entry contains only an opaque ULID, the internal numeric account identifier needed to find the row in an older backup, the accepted deletion deadline, recording time, and retention deadline. It contains no email, credential, profile, sanction, device, activity, or Capsule data. An entry is accepted at the irreversible deletion boundary before account state is erased and retained only for the 30-day maximum backup lifetime, after which hourly pruning removes it.

Every restore operation receives a new UUID and starts with deletion replay explicitly required. While that UUID has no completed checkpoint, global middleware returns `503` for all normal web, API, and OAuth traffic and the health endpoint remains available but unhealthy. The idempotent `accounts:reapply-deletions` command takes a ledger high-water mark, erases every restored account named by entries through that point, and writes the restore-specific checkpoint only after successful completion. Reusing an old checkpoint cannot open a restore because the configured restore UUID must be fresh. Operators must not disable restore mode or expose the deployment until health reports the replay boundary as ready.

Creator policy and user-facing language must describe limits as applying per Share Capsules account, not per human or legal identity. Future optional personhood providers may issue duplicate-enrollment-resistant credentials without making government identity mandatory for every account.

## Authentication

Passwords provide baseline authentication. V1 also supports passkeys and strongly encourages them, especially for creator accounts, but does not require one to create or view a Capsule. Passkeys are authenticators, not evidence of unique personhood or benign intent.

The baseline password policy requires at least 12 characters containing uppercase and lowercase letters, a number, and a symbol. Share Capsules uses Laravel Fortify as the authentication backend for registration, login, logout, password confirmation and reset, email verification, and passkey ceremonies. Application routes use Fortify handlers rather than parallel custom authentication controllers. Share Capsules supplies its own Fortify actions and responses only where product rules require them, including terms capture, the centralized password policy, session revocation after password reset, security notifications, and account-enumeration-resistant reset responses.

The official Laravel passkey packages provide WebAuthn registration, authentication, confirmation, and revocation. Passkey ceremonies execute in the browser against Fortify's same-origin endpoints; private key material remains with the platform authenticator, password manager, or security key.

Password-reset requests return the same public response whether or not an account exists for the submitted address. Registration, login, verification-email resend, and password-reset requests are rate limited. Successful login and registration regenerate the session identifier; logout invalidates the session and regenerates its CSRF token.

Email verification gates the account dashboard and every future Capsule creation, device registration, reputation accumulation, and protected-viewing route. Authentication alone is not sufficient for these capabilities.

### Browser session management

V1 web sessions use Laravel's database session store behind a Share Capsules account-session repository interface. The database implementation makes ownership checks, inspection, and targeted revocation explicit while allowing a different storage implementation later without changing account controllers or views.

An account holder can inspect active browser sessions using the recorded browser family, platform family, IP address, and last-activity time. User-agent parsing is intentionally descriptive and best-effort; it is not device fingerprinting or identity evidence.

The current session is identified and cannot be revoked through the remote-session action. Revoking a selected session is scoped by account ownership. Revoking all other sessions requires the current password. Either revocation action rotates the account's persistent-login token, preventing a revoked browser from silently recreating its session with an older remember cookie. Existing non-revoked browser sessions remain valid.

A successful password reset rotates the persistent-login token, revokes every existing browser session, and sends a security notification to the verified account email. The reset response remains successful only for the person possessing a valid reset token; the public reset-request endpoint continues to conceal whether the email is registered.

The account model supports multiple named passkeys from the beginning so a user can add more than one authenticator without creating a second Share Capsules account. The security UI records enrollment and last-use timestamps and permits individual revocation. Passkey enrollment, inspection, and revocation require a recently confirmed password or existing passkey. Password authentication and reset remain available in V1 to avoid accidental lockout. Mandatory passkeys, passwordless-only accounts, and policy gates based on authenticator strength are deferred until enrollment, device replacement, and recovery behavior are proven.

Authentication credentials are distinct from creator signing keys, Capsule content keys, and Viewer device keys. A password must never directly encrypt Capsule content or derive a long-lived creator key.

Account recovery must preserve reputation continuity. Email alone should not remain the only recovery mechanism once an account controls valuable creator keys or significant reputation.

Account recovery and creator signing-key recovery are intentionally separate. Recovering the account does not disclose, reconstruct, or replace a creator signing key. Signing authority is restored only with the creator's encrypted recovery bundle and separate recovery code.

### Browser-extension authorization

The V1 extension connects to a Share Capsules account through OAuth Authorization Code with PKCE using `S256`. Authentication and approval occur on Share Capsules; the extension does not collect or store the account password.

The extension is a public client with an exactly registered extension callback. Access tokens are short-lived, narrowly scoped, and sender-constrained to the registered Viewer device proof key. Device revocation invalidates the extension's continuing access. Device Authorization is not part of the V1 desktop flow.

The Share Capsules implementation uses Laravel Passport for this OAuth server boundary. Each environment provisions one fixed, public Viewer-extension client with a UUID, no secret, only the Authorization Code grant, and one exact `https://<extension-id>.chromiumapp.org/oauth/callback` redirect. The extension pins the configured CTX issuer and requires both OAuth endpoints to share that issuer origin. It requests the `extension:connect` scope and explicit consent, creates a fresh random state, verifier, and `S256` challenge for every attempt, retains the verifier only for that in-progress ceremony, validates the returned state and exact callback before exchanging the code, and sends no account password, session cookie, or client secret.

The first OAuth approval issues a ten-minute `extension:connect` bearer access token and no usable refresh token. It is accepted only by device-registration endpoints and never by CTX protected-resource routes. After registration, a second PKCE approval for the mutually exclusive `ctx:authorize` scope requires a fresh RFC 9449 token-endpoint proof from the active Ed25519 Viewer proof key. The resulting access token is sender-constrained through `cnf.jkt`, uses the `DPoP` scheme, and has a rotating 30-day refresh token bound to the same device.

## Device registration

Each installed trusted Viewer creates a device-key set containing an Ed25519 proof key pair and a separate X25519 agreement key pair. The Share Capsules service associates both public keys and one device record with the account after authenticated approval.

The extension generates both key pairs with Web Cryptography and marks each private key non-exportable. It chooses the device UUID and persists that identifier and the resulting `CryptoKey` objects in extension-owned IndexedDB before beginning registration rather than serializing private key bytes. The challenge and final server record are bound to that same device UUID, so a lost HTTP response does not leave an unidentifiable server-side device. The service accepts exact public OKP JWKs containing only `kty`, `crv`, and `x`, requires canonical 32-byte unpadded base64url key values, rejects private or additional JWK members, and derives RFC 7638 SHA-256 thumbprints itself.

Registration uses a five-minute, single-use challenge bound to the verified account and both public-key thumbprints. The extension signs the versioned registration message with Ed25519. It separately derives a secret from its X25519 private key and a server ephemeral X25519 public key, derives a confirmation key with HKDF-SHA-256, and authenticates the same registration message with HMAC-SHA-256. The server stores only the expected short-lived confirmation value and erases its ephemeral private key and derived secrets after challenge creation. A device becomes active only after both possession proofs succeed atomically.

Expired challenges are retained for no more than 24 additional hours for replay and failure handling, then removed by the scheduled pruning process.

A device record may include:

- Device identifier, Ed25519 proof public key, and X25519 agreement public key
- Registration and last-use timestamps
- User-provided device name
- Current status: active, suspended, or revoked
- Consented device-continuity and risk assertions

The account holder must be able to inspect and revoke registered devices.

The account security UI exposes device name, status, enrollment and last-use times, and shortened public-key thumbprints. Naming does not change key identity. Suspension is reversible and prevents future CTX use once token binding is active. Revocation is permanent: the record and key thumbprints remain reserved so the same installation keys cannot be silently registered again. Suspension, activation, and revocation require recent account authentication; cross-account changes are forbidden.

The proof key demonstrates control of a registered Viewer installation; the agreement key receives HPKE-wrapped content keys. Neither proves legal identity or unique personhood. Revoking the device revokes both keys.

The registration access token remains a bootstrap credential accepted only by the two registration endpoints. CTX credentials are issued separately after device registration. Every refresh proves the same device key and rotates the refresh token; rotated-token reuse revokes the device token family. Suspending or revoking the device immediately invalidates its continuing extension access, while reactivation requires fresh authorization rather than restoring old credentials.

## Account closure and restoration

Account closure requires recent authentication and an explicit acknowledgment of the consequences. Closure records a fixed 30-day deletion deadline, terminates every browser session, rotates persistent-login state, revokes pending authorization codes and all OAuth access and refresh tokens, removes pending device-registration challenges, and suspends active Viewer devices. Already revoked devices remain revoked. No closed account may authenticate, register a device, obtain or refresh an OAuth token, create a Capsule, or request CTX authorization.

Before closure, the account holder can download a versioned Capsule inventory. The same inventory remains available through the authenticated recovery flow during the recovery period. The inventory contract is implemented behind a repository interface so Capsule records can be added without changing the closure boundary; before Capsule persistence exists, the valid inventory contains an empty `capsules` collection rather than inventing placeholder records.

Closure sends a high-entropy, one-time recovery token to the verified email address inside a temporary signed URL that expires at the deletion deadline. A public recovery-link request returns the same response for unknown, active, expired, and recoverable accounts, and rotates the token only for a recoverable account. Following the email link presents the consequences before a signed, short-lived `POST` completes restoration; link scanners cannot restore an account with a `GET`.

Restoration clears the pending deletion state and invalidates the recovery token. It does not restore browser sessions, authorization codes, access tokens, refresh tokens, or device activity. Viewer devices remain suspended until the account holder signs in, reviews them, and deliberately reactivates them. This prevents restoration from silently reviving credentials that may have been exposed before closure.

## Permanent deletion

A scheduled, single-provider worker processes bounded batches of accounts only after their complete recovery deadline has elapsed. It locks and rechecks each account inside the deletion transaction, so an account restored before the lock is acquired cannot be deleted from a stale candidate list. The exact deadline is the irreversible boundary: restoration requires a future deadline, while deletion accepts a deadline equal to or earlier than the current time.

Permanent deletion removes password-reset state, sessions, passkeys, Viewer devices and challenges, OAuth authorization codes, access tokens, refresh tokens, the account row, and all account-linked trust-profile state. V1 has not begun persisting a detailed trust profile, so the current repository is intentionally empty; the deletion dependency remains explicit and must be replaced when profile storage is introduced. Capsule-global counters are not account-linked state and are not deleted through this path.

Deletion participants run before the account row is removed while it remains locked. A participant failure aborts and reports that account without preventing other eligible accounts from being attempted; the failed deletion remains eligible for the next run. The active-sanction and durable deletion-ledger participants are attached at this boundary so required records commit before personal account state disappears.

Ordinary deletion retains no account mapping. The verified email becomes available for a new registration, but the replacement receives a new account identifier and has no inherited devices, credentials, counters, trust profile, reputation, or continuity. Reusing the same email address does not restore the deleted account.

## Account identifiers

The global Share Capsules account identifier is private to the account and service components that require it. It must not be exposed to Hosts or used as a universal cross-site identifier.

Where persistent recognition is necessary, the CTX service should issue an opaque identifier scoped to the creator, community, or other policy context.

## Optional assurance

An account holder may opt into additional evidence, including:

- Device binding and continuity
- Device or platform attestation where available
- Liveness or photo verification
- Photo-to-identity-document matching
- Identity verification
- Duplicate-enrollment or unique-person checks

These are separate assertions. A photo, an identity match, and unique enrollment must not be treated as equivalent.

Specialist providers should perform sensitive identity proofing. The Share Capsules service receives a limited credential or result rather than raw photographs, identity documents, document numbers, or biometric templates. Creators receive only the policy predicate or aggregate assurance explicitly approved by the account holder.

## Open questions

- How are creator-scoped pseudonyms generated and rotated?
- Which optional identity providers and assurance semantics are acceptable?

## Related documents

- [System overview](system-overview.md)
- [Key management](key-management.md)
- [Human confidence](../05_ctx/human-confidence.md)
- [Privacy model](../07_security-and-privacy/privacy-model.md)
