# Coding Standards

This document defines the default implementation standards for Share Capsules, Capsule, and CTX code. It complements the repository's [agent workflow](agent-workflow.md), design intent, automated formatting, static analysis, and tests.

These standards favor object-oriented design where objects make responsibilities and boundaries clearer. They do not require classes when a pure function, module, type, or framework convention is the simpler and more accurate model.

## Core expectations

- Prefer correctness, clarity, and auditability over cleverness.
- Keep each class, function, and module focused on one coherent responsibility.
- Make dependencies and side effects explicit.
- Program against stable domain or integration boundaries, not incidental implementation details.
- Use composition and delegation before inheritance.
- Keep security-sensitive paths small, deterministic, and easy to review.
- Remove duplicated knowledge while resisting premature generalization.
- Preserve the terminology and invariants defined in `_docs/design` and versioned specifications.

## Object-oriented design

### Responsibilities and cohesion

A class should have one primary reason to change. Group behavior with the state and invariants it owns; do not group unrelated operations merely because they serve the same page or feature.

Avoid:

- God services that coordinate an entire workflow and implement every step
- Models that accumulate unrelated business, transport, presentation, and persistence behavior
- Utility classes used as unstructured dumping grounds
- Boolean parameters that make one method perform several conceptually different operations

Prefer small collaborators with names that reflect domain responsibilities. Orchestration may remain in an application service while parsing, validation, policy evaluation, signing, encryption, persistence, and transport remain separate concerns.

### Dependency management

- Use constructor injection for required collaborators.
- Keep constructors free of I/O and meaningful business work.
- Avoid service locators, hidden container lookups, mutable global state, and static dependencies in domain code.
- Depend on clocks, randomness, key stores, network clients, and persistence through explicit boundaries when deterministic testing or replacement matters.
- Pass request-specific data to methods rather than retaining it in long-lived mutable services.

Framework dependency injection is an implementation mechanism, not permission to obscure a class's real dependencies.

### Interfaces and abstractions

Create an interface when it represents a genuine boundary or multiple meaningful implementations are expected, including:

- CTX Providers and Key Brokers
- Cryptographic or key-custody adapters
- Content profiles and their registry
- Clocks, randomness sources, and external transports used by security-sensitive code
- Persistence boundaries whose implementation must be isolated from domain behavior

Do not create an interface solely to mirror every concrete class. A single internal implementation may remain concrete until replacement, isolation, or testing needs establish a real boundary.

Keep interfaces small and behavior-oriented. Their contracts must define inputs, outputs, failures, and security invariants rather than expose framework or storage internals.

### Composition, inheritance, and polymorphism

- Prefer composition for reusable behavior and replaceable policies.
- Use inheritance only for a genuine substitutable relationship with stable shared semantics.
- Do not use inheritance merely to reuse a few lines of code.
- Keep framework base-class inheritance at framework boundaries.
- Ensure every implementation honors the full behavioral and failure contract of its interface.

### Value objects and immutability

Use immutable value objects or branded types when a value has validation, format, units, or domain meaning that a primitive cannot safely communicate. Strong candidates include Capsule identifiers, payload identifiers, suite identifiers, versions, hashes, nonces, key identifiers, provider identifiers, timestamps, limits, and encoded cryptographic values.

Validate once at the boundary and prevent invalid instances from being constructed. Do not introduce wrappers that add names but no invariant, behavior, or type safety.

## DRY without premature abstraction

DRY means that authoritative knowledge should have one maintained representation. It does not mean that every similar-looking code fragment must share an abstraction.

Centralize immediately when duplication could cause semantic or security drift, especially:

- Protocol identifiers, versions, algorithms, domain-separation labels, limits, and error codes
- Manifest, policy, ticket, and discovery schemas
- Cryptographic byte construction and canonicalization rules
- Authorization invariants and lifecycle state transitions
- Security-sensitive validation and redaction rules

Small incidental duplication may remain when the code serves different concepts or is likely to evolve independently. Before extracting shared code, identify the shared domain concept and give it an accurate name. If no stable concept exists, duplication is often safer than coupling.

As a default heuristic, wait for repeated use before extracting a general-purpose abstraction. Do not wait when two implementations must conform to the same normative rule; define that rule once and verify both implementations with shared fixtures or test vectors.

## Layer and boundary rules

- Keep controllers, console commands, queue handlers, and extension event listeners thin.
- Validate and translate untrusted input at the system boundary.
- Place use-case orchestration in application services rather than HTTP or browser plumbing.
- Keep domain decisions independent of Laravel requests, Eloquent records, browser DOM objects, and transport-specific response shapes where practical.
- Keep infrastructure adapters responsible for databases, HTTP, browser APIs, cryptographic providers, and external services.
- Map transport and persistence data into explicit domain types before applying security-sensitive rules.
- Return structured outcomes or typed errors; do not make callers parse exception messages.

Dependency direction should point toward domain contracts. A domain rule must not import a web controller, framework request, database record, or browser UI component.

## PHP and Laravel

- Follow PSR-12 as enforced by Laravel Pint and use strict, explicit types wherever framework compatibility permits.
- Use `final` for concrete classes that are not designed for inheritance.
- Prefer constructor property promotion and `readonly` state for immutable collaborators and value objects.
- Keep controllers responsible for transport concerns: authorization entry, validated input, application-service invocation, and response mapping.
- Use Form Requests or dedicated input objects when validation is more than trivial route plumbing.
- Use Laravel policies or explicit authorization services for user permissions; do not scatter permission checks across controllers and views.
- Use Eloquent where it keeps persistence clear. Do not add repository interfaces merely to hide Eloquent; introduce a persistence boundary when domain isolation, transactional behavior, or replaceability requires one.
- Make transaction boundaries explicit for counters, ticket redemption, lifecycle transitions, and other atomic invariants.
- Avoid model observers and framework events for critical invariants when they make execution order or failure behavior implicit.
- Never place plaintext content, raw keys, credentials, tokens, or sensitive evidence in logs, exception context, jobs, or serialized events.

## TypeScript

- Keep strict TypeScript enabled; do not weaken shared compiler settings to accommodate one implementation.
- Prefer `unknown` plus explicit narrowing over `any`.
- Use discriminated unions for versioned messages, structured outcomes, and errors.
- Use classes when identity, encapsulated mutable state, lifecycle, or polymorphic behavior justifies them.
- Prefer pure functions and modules for canonicalization, encoding, hashing, deterministic validation, and other stateless transformations.
- Use `readonly` properties and collections when mutation is not part of the contract.
- Keep WebExtension, DOM, storage, and network APIs behind adapters so Capsule and CTX logic remains testable outside the browser.
- Do not use TypeScript type assertions as a substitute for runtime validation of files, network responses, manifests, policies, or tokens.
- Export the smallest useful public surface from each workspace package.

## Functions, methods, and naming

- Use domain terminology consistently with the design documents and specifications.
- Name operations for their observable intent, not their current mechanism.
- Keep parameters few and cohesive; use an input object when values form a meaningful request or context.
- Keep control flow shallow with guard clauses where they improve readability.
- Separate commands that change state from queries that return information when practical.
- Do not return `null`, `false`, or an empty value for multiple unrelated failure conditions.
- Comments should explain rationale, invariants, formats, or non-obvious risk—not restate the code.

## Error handling and fail-closed behavior

- Define stable machine-readable error categories at public and protocol boundaries.
- Preserve useful internal causes without leaking secrets or sensitive account information.
- Reject unknown versions, algorithms, profiles, predicates, fields, states, and encodings where the specification requires closed-world validation.
- Never silently substitute a weaker algorithm, policy, provider, or validation path.
- Keep retryability explicit; do not retry non-idempotent security operations without an accepted replay design.

## Testing standards

- Every accepted, testable design requirement implemented in code must have an automated test that would fail if the requirement were removed or weakened. Document the reason when a requirement cannot be tested automatically.
- Name tests for the behavior or invariant they protect so the suite remains readable as an executable design contract.
- Test observable behavior and invariants rather than private implementation details.
- Add positive, boundary, malformed, unsupported, tampered, and downgrade cases for protocol and cryptographic code.
- Use deterministic fixtures, clocks, randomness substitutes, and published test vectors where reproducibility matters.
- Verify each interface through contract tests when multiple implementations must behave consistently.
- Add regression coverage with every defect fix when practical.
- Avoid tests that only assert framework defaults, `true`, or implementation wiring without meaningful project behavior.
- A refactor is incomplete until existing behavior remains covered and all relevant checks pass.

## Review checklist

Before accepting implementation code, confirm:

- Responsibilities and layer boundaries are clear.
- Dependencies and side effects are explicit.
- Interfaces represent real boundaries rather than ceremony.
- Normative knowledge has one authoritative definition.
- Similar code was not coupled without a stable shared concept.
- Invalid states and untrusted inputs are handled explicitly.
- Security-sensitive behavior fails closed and avoids secret-bearing logs.
- Names match the project's domain language.
- Tests cover behavior, boundaries, and relevant failure paths.
- Formatting, linting, typechecking, tests, and builds pass through `./_infra/kit check`.

These standards are defaults, not substitutes for judgment. A justified exception should make the code clearer, safer, or more faithful to an accepted framework or protocol contract, and should be documented when it would otherwise surprise a future maintainer.
