# Accounts and Identity

Status: Draft
Last updated: 2026-06-20

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

Before permanent deletion, Share Capsules warns the creator which Capsules will stop working and allows them to download an inventory of those Capsules. When the 30-day period expires, remaining Capsule release handles are revoked and the broker destroys the associated content-key material. Hosted `.capsule` files remain wherever the creator placed them, but Share Capsules can no longer authorize their decryption. Permanent deletion then removes the account's personal data and detailed trust profile subject only to narrowly justified, purpose-bound retention.

A replacement account starts without the deleted account's reputation, continuity, registered-device history, or per-account Capsule counters. It does not inherit either favorable or unfavorable standing. Capsule-global counters survive account deletion because they measure releases against the creator's Capsule rather than the viewer account.

Ordinary account deletion leaves no account-level abuse tombstone. If the account is subject to an active security or abuse sanction when deletion completes, V1 may retain a restricted sanction tombstone for no more than 90 days from deletion. It contains only a keyed HMAC of the normalized verified email address, the sanction category, imposed and expiry timestamps, and an appeal reference. It contains no raw email address, viewing history, per-account counters, device fingerprint, credential, or trust profile.

The tombstone exists only to enforce the still-active sanction and support correction or appeal. It is deleted immediately if the sanction is reversed and no later than its 90-day maximum. Access is limited to the signup-abuse check and authorized security or appeal personnel; it must not support advertising, general reputation, creator disclosure, or account reconstruction. A different email may evade this modest V1 control, and the product must not present it as duplicate-person detection.

Deleted account data may remain in encrypted disaster-recovery backups for no more than 30 additional days after permanent deletion. Backups are not searchable, available to normal application paths, or used for analytics, policy evaluation, sanction enforcement, or account reconstruction. A durable deletion ledger records the minimum identifiers needed to reapply deletions before any restored backup is returned to service. The ledger itself must not preserve deleted profile or activity data.

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

This implementation checkpoint issues a ten-minute bearer access token and deliberately does not enable refresh tokens for the client. The token is not yet accepted by CTX protected-resource routes. Device registration and RFC 9449 DPoP sender constraint are the next Phase 3 boundary; CTX access must remain closed until they bind the token to the registered Ed25519 Viewer proof key. Refresh tokens may be enabled only with the accepted rotation, replay-response, secure-storage, and device-revocation behavior.

## Device registration

Each installed trusted Viewer creates a device-key set containing an Ed25519 proof key pair and a separate X25519 agreement key pair. The Share Capsules service associates both public keys and one device record with the account after authenticated approval.

A device record may include:

- Device identifier, Ed25519 proof public key, and X25519 agreement public key
- Registration and last-use timestamps
- User-provided device name
- Current status: active, suspended, or revoked
- Consented device-continuity and risk assertions

The account holder must be able to inspect and revoke registered devices.

The proof key demonstrates control of a registered Viewer installation; the agreement key receives HPKE-wrapped content keys. Neither proves legal identity or unique personhood. Revoking the device revokes both keys.

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
