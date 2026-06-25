@extends('layouts.app')

@section('title', 'Technical overview — Capsule and CTX architecture')
@section('description', 'A technical overview of Capsule, CTX, the official service registry, cryptographic boundaries, trust policy evaluation, key release, privacy, and V1 implementation scope.')
@section('robots', 'index, follow')

@php
    $repositoryUrl = rtrim((string) config('sharecapsules.public.repository_url'), '/');
    $sources = [
        ['System architecture', '_docs/design/03_architecture/system-overview.md'],
        ['Access and data flow', '_docs/design/03_architecture/access-and-data-flow.md'],
        ['Official network and registry', '_docs/design/03_architecture/official-network-and-registry.md'],
        ['Open protocol ADR', '_docs/design/08_decisions/ADR-0001-open-protocol-official-network.md'],
        ['Capsule design intent', '_docs/design/04_capsule/design-intent.md'],
        ['CTX design intent', '_docs/design/05_ctx/design-intent.md'],
        ['Protocol contracts V1', '_docs/design/10_specifications/ctx/protocol-contracts-v1.md'],
        ['Cryptographic suite V1', '_docs/design/07_security-and-privacy/cryptographic-suite-v1.md'],
        ['Privacy model', '_docs/design/07_security-and-privacy/privacy-model.md'],
        ['Threat model V1', '_docs/design/07_security-and-privacy/threat-model-v1.md'],
    ];
@endphp

@section('content')
    <section class="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:px-10 lg:pt-28">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Living technical overview</p>
        <h1 class="mt-5 max-w-5xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">Open protocol. Opinionated official network.</h1>
        <p class="mt-7 max-w-4xl text-lg leading-8 text-muted">Capsule defines the portable encrypted artifact. Capsule Trust Exchange (CTX) defines the authorization and key-release conversation. Share Capsules is the first official implementation, with a curated registry that decides which providers and brokers official tools will trust by default.</p>
        <div class="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase">
            <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
            Experimental architecture — interfaces and implementation are evolving
        </div>
    </section>

    <div class="border-y border-line bg-white">
        <div class="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[15rem_1fr] lg:px-10 lg:py-20">
            <aside class="lg:sticky lg:top-8 lg:self-start" aria-label="Technical overview sections">
                <p class="text-xs font-bold tracking-[0.14em] text-muted uppercase">On this page</p>
                <nav class="mt-4 grid gap-1 text-sm font-semibold text-muted">
                    @foreach ([
                        '#model' => 'System model',
                        '#protocol-flow' => 'Protocol flow',
                        '#manifest' => 'Capsule bindings',
                        '#cryptography' => 'Cryptography',
                        '#registry' => 'Official registry',
                        '#trust-privacy' => 'Trust and privacy',
                        '#scope' => 'V1 scope and limits',
                        '#status' => 'Implementation status',
                        '#design-sources' => 'Design sources',
                    ] as $href => $label)
                        <a class="rounded-lg px-3 py-2 transition hover:bg-canvas hover:text-ink" href="{{ $href }}">{{ $label }}</a>
                    @endforeach
                </nav>
            </aside>

            <div class="min-w-0">
                <section id="model" class="scroll-mt-8 pb-20 lg:pb-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">System model</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">The protocol and the official network are separate layers.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">A compatible ecosystem can implement Capsule, CTX, creator tooling, Viewers, providers, brokers, and its own trust list. The Share Capsules product adds an official creator and Viewer experience that uses a curated registry instead of blindly trusting arbitrary service URLs.</p>

                    <div class="mt-8 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
                        @foreach ([
                            ['capsule', 'Capsule', 'A portable, signed artifact containing encrypted payload metadata, content-profile requirements, creator public policy, provider identity, broker identity, release handle, and integrity commitments.'],
                            ['ctx-protocol', 'CTX Protocol', 'The request/response protocol that lets a Viewer validate a Capsule, request policy evaluation, receive a short-lived authorization, and redeem it for a device-bound wrapped key.'],
                            ['registry', 'Official Registry', 'The Share Capsules trust list for recognized CTX Providers and Key Brokers, including status, capabilities, keys, endpoints, and revocation/deprecation state.'],
                            ['trusted-viewer', 'Trusted Viewer', 'The official or compatible client that validates registry status, explains requirements, obtains consent, coordinates CTX, receives the wrapped key, and renders locally.'],
                        ] as [$icon, $heading, $copy])
                            <article class="flex gap-4 bg-white p-5">
                                <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface" aria-hidden="true">
                                    <x-dynamic-component :component="'public.icons.'.$icon" class="size-9" />
                                </span>
                                <div>
                                    <h3 class="font-bold text-ink">{{ $heading }}</h3>
                                    <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                                </div>
                            </article>
                        @endforeach
                    </div>
                </section>

                <section id="protocol-flow" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Protocol flow</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">The Host distributes bytes; the Viewer drives trust and key release.</h2>
                    <ol class="mt-8 grid gap-4">
                        @foreach ([
                            ['01', 'Fetch and verify Capsule', 'The Viewer downloads the Capsule from any compatible Host, verifies manifest signature, content commitments, format version, cryptographic suite, content profile, policy digest, and declared provider/broker identities.'],
                            ['02', 'Check registry recognition', 'Official tools consult the Share Capsules registry before sending credentials, device proofs, authorization requests, tickets, or key-release requests to declared services.'],
                            ['03', 'Explain policy and ask consent', 'The Viewer presents the creator-signed trust policy and asks whether the visitor wants to disclose the evidence required for this exact opening.'],
                            ['04', 'Evaluate policy', 'The Trust Provider / CTX Provider evaluates only the requirements relevant to this Capsule, account, device, action, policy digest, and current enforcement state.'],
                            ['05', 'Issue narrow authorization', 'On success, the provider returns a short-lived, signed, broker-audience-bound authorization ticket for one exact Capsule payload request.'],
                            ['06', 'Redeem with broker', 'The Key Broker validates the ticket, enforces replay and limits, commits the release, and returns the content key wrapped to the registered Viewer agreement key.'],
                            ['07', 'Decrypt and render locally', 'The Viewer unwraps the content key locally and renders in its trusted viewing surface. The Host never receives the plaintext or content key.'],
                        ] as [$number, $heading, $copy])
                            <li class="grid gap-4 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
                                <span class="grid size-10 place-items-center rounded-xl bg-brand/10 text-sm font-bold text-brand" aria-hidden="true">{{ $number }}</span>
                                <div>
                                    <h3 class="font-bold text-ink">{{ $heading }}</h3>
                                    <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                                </div>
                            </li>
                        @endforeach
                    </ol>
                </section>

                <section id="manifest" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Capsule bindings</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">The signed manifest fixes the security-critical wiring.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">A Host can move or mirror a Capsule, but it cannot rewrite which policy, provider, broker, content profile, or payload commitments apply without invalidating the creator signature. That immutability is what lets the Viewer reject tampering before disclosure.</p>
                    <div class="mt-8 grid gap-4 md:grid-cols-2">
                        @foreach ([
                            ['Creator authority', 'Creator signing key identity, public verification key, manifest signature, Capsule ID, revision, and canonical policy digest.'],
                            ['Content commitments', 'Payload descriptors, content-profile identifier and version, encryption suite, entry commitments, sizes, hashes, and authenticated-data bindings.'],
                            ['Trust path', 'CTX issuer/provider identity, accepted assertion issuers or trust providers, required policy predicates, consent requirements, time windows, and limits.'],
                            ['Key path', 'Key Broker identity, broker audience, release handle, payload key registration binding, and ticket redemption constraints.'],
                        ] as [$heading, $copy])
                            <article class="rounded-2xl border border-line bg-white p-6 shadow-card">
                                <h3 class="font-bold text-ink">{{ $heading }}</h3>
                                <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                            </article>
                        @endforeach
                    </div>
                </section>

                <section id="cryptography" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Cryptography</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Distinct keys, distinct purposes, no silent substitution.</h2>
                    <ul class="mt-7 grid gap-px overflow-hidden rounded-2xl border border-artifact-line bg-artifact-line text-sm text-slate-300 md:grid-cols-2">
                        @foreach ([
                            ['Creator manifest signing', 'Ed25519 signs the canonical manifest. The private key stays with creator-controlled tooling and does not move through the Host.'],
                            ['Payload encryption', 'AES-256-GCM encrypts protected payloads with fresh content keys and nonces. The raw content key is registered with the selected broker, not embedded in the Capsule.'],
                            ['Viewer device proof', 'A registered Ed25519 device key binds account/device requests so tickets cannot be redeemed by a random client.'],
                            ['Viewer key agreement', 'A distinct X25519 agreement key receives HPKE-wrapped content keys bound to the Capsule, payload, ticket, and broker context.'],
                            ['CTX authorization ticket', 'The provider signs short-lived tickets with a provider key, exact broker audience, replay identifier, action, policy digest, and device binding.'],
                            ['Registry and discovery keys', 'Official tools must verify registry and service metadata freshness, signatures, transport security, status, and expected key material before interaction.'],
                        ] as [$heading, $copy])
                            <li class="bg-artifact p-6">
                                <strong class="text-white">{{ $heading }}</strong>
                                <p class="mt-2 leading-6">{{ $copy }}</p>
                            </li>
                        @endforeach
                    </ul>
                    <p class="mt-5 border-l-2 border-amber-400 pl-4 text-sm leading-6 text-muted">Share Capsules V1 operates the initial provider and broker, so V1 is not a claim of cryptographic zero access. The design still preserves separable roles, dedicated credentials, auditable contracts, and a migration path to independent providers or brokers.</p>
                </section>

                <section id="registry" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Official registry</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Recognition is a product security boundary, not protocol ownership.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">A protocol-compatible provider or broker is not automatically trusted by official tools. The official registry lets Share Capsules choose which services its creator and Viewer tools will interact with by default.</p>
                    <div class="mt-8 grid gap-4 md:grid-cols-3">
                        @foreach ([
                            ['Creation-time checks', 'Official creator tooling offers only recognized providers and brokers for the relevant content profile, policy type, and key-release profile.'],
                            ['Viewing-time checks', 'Official Viewers can refuse Capsules whose declared provider or broker is unknown, stale, suspended, deprecated, or revoked.'],
                            ['Revocation limits', 'The registry can stop official tools from future interaction, but it cannot force independent ecosystems offline or rewrite already-signed Capsules.'],
                        ] as [$heading, $copy])
                            <article class="rounded-2xl border border-line bg-surface p-6">
                                <h3 class="font-bold text-ink">{{ $heading }}</h3>
                                <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                            </article>
                        @endforeach
                    </div>
                </section>

                <section id="trust-privacy" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Trust and privacy</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Policy predicates, not a universal trust score.</h2>
                    <div class="mt-7 grid gap-5 md:grid-cols-2">
                        @foreach ([
                            ['Creator-defined policy', 'The Capsule carries a signed trust policy chosen by the creator. A provider may deny or enforce stricter operational controls, but must not authorize under weaker requirements than the signed policy.'],
                            ['Viewer consent', 'The Viewer explains what evidence will be disclosed and lets the visitor decline. Declining may mean the Capsule cannot be opened.'],
                            ['Limited results', 'Creators receive policy results and safe aggregates, not raw account history, email, global identity, device secrets, or complete viewing behavior.'],
                            ['Contextual enforcement', 'Tickets, evidence, device state, time windows, content-key releases, and counters are scoped to the Capsule, revision, payload, action, account, and device.'],
                        ] as [$heading, $copy])
                            <article class="rounded-2xl border border-line p-6">
                                <h3 class="font-bold">{{ $heading }}</h3>
                                <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                            </article>
                        @endforeach
                    </div>
                </section>

                <section id="scope" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">V1 scope and limits</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">A focused proof, not universal content control.</h2>
                    <ul class="mt-6 space-y-3 text-sm leading-6 text-muted">
                        <li><strong class="text-ink">Primary scenario:</strong> protected static content on an independently hosted page, opened through a trusted Viewer.</li>
                        <li><strong class="text-ink">Official network:</strong> V1 recognizes the Share Capsules CTX Provider and Share Capsules Key Broker while keeping provider and broker identities explicit in the protocol.</li>
                        <li><strong class="text-ink">Protection goal:</strong> raise the cost of anonymous bulk harvesting and make releases conditional, accountable, and revocable through official tools.</li>
                        <li><strong class="text-ink">Not promised:</strong> perfect copy prevention, guaranteed humanity, one-human-one-account, moral trust, or protection from misuse by an authorized person.</li>
                        <li><strong class="text-ink">Deferred:</strong> third-party service recognition criteria, additional content profiles, mobile/cross-browser Viewers, adaptive renditions, chunking, federation, and stronger optional personhood credentials.</li>
                    </ul>
                </section>

                <x-public.project-status id="status" class="scroll-mt-8 border-x-0 border-b-0 px-0 py-20 lg:py-24 [&>div]:px-0" />

                <section id="design-sources" class="scroll-mt-8 border-t border-line py-20 lg:py-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Design sources</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">The detailed intent remains in living Markdown.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">These are the source design documents behind this overview. Each link opens the corresponding Markdown file in the public project repository when a repository URL is configured.</p>
                    <ul class="mt-7 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                        @foreach ($sources as [$label, $path])
                            <li class="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <span class="font-bold text-ink">{{ $label }}</span>
                                @if ($repositoryUrl !== '')
                                    <a class="break-all font-mono text-xs text-brand hover:text-brand-strong" href="{{ $repositoryUrl }}/blob/master/{{ $path }}" target="_blank" rel="noopener noreferrer">{{ $path }}</a>
                                @else
                                    <code class="break-all text-xs text-muted">{{ $path }}</code>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                </section>
            </div>
        </div>
    </div>
@endsection
