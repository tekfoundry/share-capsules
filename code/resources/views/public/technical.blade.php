@extends('layouts.app')

@section('title', 'Technical overview — Capsule and CTX architecture')
@section('description', 'A living technical overview of Capsule, CTX, cryptographic boundaries, privacy, provider independence, V1 scope, and implementation status.')

@php
    $repositoryUrl = rtrim((string) config('sharecapsules.public.repository_url'), '/');
    $sources = [
        ['System architecture', '_docs/design/03_architecture/system-overview.md'],
        ['Capsule design intent', '_docs/design/04_capsule/design-intent.md'],
        ['CTX design intent', '_docs/design/05_ctx/design-intent.md'],
        ['Protocol contracts V1', '_docs/design/10_specifications/ctx/protocol-contracts-v1.md'],
        ['Privacy model', '_docs/design/07_security-and-privacy/privacy-model.md'],
        ['Threat model V1', '_docs/design/07_security-and-privacy/threat-model-v1.md'],
    ];
@endphp

@section('content')
    <section class="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:px-10 lg:pt-28">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Living technical overview</p>
        <h1 class="mt-5 max-w-5xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">A portable encrypted-content and trust-exchange architecture.</h1>
        <p class="mt-7 max-w-4xl text-lg leading-8 text-muted">Capsule carries protected content and creator intent. Capsule Trust Exchange (CTX) evaluates whether a Viewer satisfies that intent. Share Capsules is the first reference implementation—not a required permanent operator.</p>
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
                        '#terms' => 'Core terms',
                        '#architecture' => 'Architecture',
                        '#cryptography' => 'Cryptographic boundaries',
                        '#trust-privacy' => 'Trust and privacy',
                        '#independence' => 'Provider independence',
                        '#scope' => 'V1 scope and limits',
                        '#status' => 'Implementation status',
                        '#design-sources' => 'Design sources',
                    ] as $href => $label)
                        <a class="rounded-lg px-3 py-2 transition hover:bg-canvas hover:text-ink" href="{{ $href }}">{{ $label }}</a>
                    @endforeach
                </nav>
            </aside>

            <div class="min-w-0">
                <section id="terms" class="scroll-mt-8">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Core terms</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Three technologies, six bounded roles.</h2>
                    <dl class="mt-8 grid gap-4 md:grid-cols-3">
                        @foreach ([
                            ['Capsule', 'A portable, versioned container holding encrypted payloads, signed metadata, and creator-defined access policy.'],
                            ['CTX', 'The open protocol for presenting consented evidence and evaluating a Capsule policy for one exact access request.'],
                            ['Share Capsules', 'TekFoundry’s user-facing reference implementation of account, provider, creator, and Viewer services.'],
                        ] as [$term, $definition])
                            <div class="rounded-2xl border border-line bg-surface p-5">
                                <dt class="font-bold text-ink">{{ $term }}</dt>
                                <dd class="mt-2 text-sm leading-6 text-muted">{{ $definition }}</dd>
                            </div>
                        @endforeach
                    </dl>
                    <p class="mt-6 text-sm leading-6 text-muted">The operational roles are Creator tool, compatible Host, trusted Viewer, CTX Provider, Key Broker, and the creator who selects the policy and recognized services.</p>
                </section>

                <section id="architecture" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Architecture</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Distribution is separate from authorization.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">A Host serves an opaque `.capsule` file and public fallback content. The Viewer verifies the signed package before disclosure, obtains a narrow CTX authorization, redeems it with the selected broker, and decrypts only inside an isolated Viewer surface.</p>
                    <a class="mt-5 inline-flex text-sm font-bold text-brand hover:text-brand-strong" href="{{ route('how-it-works') }}">Walk through the complete flow <span class="ml-2" aria-hidden="true">→</span></a>
                </section>

                <section id="cryptography" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Cryptographic boundaries</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Keys have separate purposes and owners.</h2>
                    <ul class="mt-7 grid gap-px overflow-hidden rounded-2xl border border-artifact-line bg-artifact-line text-sm text-slate-300 md:grid-cols-2">
                        @foreach ([
                            ['Creator signing key', 'Ed25519 signs the manifest locally and never enters the normal Laravel application.'],
                            ['Capsule content key', 'A fresh AES-256-GCM key encrypts each payload and is registered with the selected broker.'],
                            ['Viewer proof key', 'A registered Ed25519 device key binds OAuth/CTX requests and proves possession.'],
                            ['Viewer agreement key', 'A distinct X25519 key receives an HPKE-wrapped content key for local decryption.'],
                        ] as [$heading, $copy])
                            <li class="bg-artifact p-6"><strong class="text-white">{{ $heading }}</strong><p class="mt-2 leading-6">{{ $copy }}</p></li>
                        @endforeach
                    </ul>
                    <p class="mt-5 border-l-2 border-amber-400 pl-4 text-sm leading-6 text-muted">Share Capsules V1 operates both Provider and Broker services, so it is not cryptographic “zero access.” Process isolation and dedicated credentials reduce ordinary application access; future independent or split-key brokers may reduce operator trust further.</p>
                </section>

                <section id="trust-privacy" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Trust and privacy</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Conditions and predicates—not a universal reputation currency.</h2>
                    <div class="mt-7 grid gap-5 md:grid-cols-2">
                        <div class="rounded-2xl border border-line p-6"><h3 class="font-bold">Creator-selected</h3><p class="mt-2 text-sm leading-6 text-muted">Creators choose recognized providers and policy conditions. CTX does not define one globally trustworthy person.</p></div>
                        <div class="rounded-2xl border border-line p-6"><h3 class="font-bold">Viewer-consented</h3><p class="mt-2 text-sm leading-6 text-muted">Viewers choose whether to disclose the evidence required for a request. Declining may mean the policy is not satisfied.</p></div>
                        <div class="rounded-2xl border border-line p-6"><h3 class="font-bold">Minimally revealed</h3><p class="mt-2 text-sm leading-6 text-muted">The creator receives policy results and safe aggregates—not email, global identity, raw account history, or complete viewing behavior.</p></div>
                        <div class="rounded-2xl border border-line p-6"><h3 class="font-bold">Time-bound and contextual</h3><p class="mt-2 text-sm leading-6 text-muted">Evidence, authorization, device state, limits, and sanctions can expire or be revoked and apply only in their declared context.</p></div>
                    </div>
                </section>

                <section id="independence" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Provider independence</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Protocol before monopoly.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">Capsules name provider and broker discovery identities rather than assuming one permanent Share Capsules endpoint. Versioned contracts, portable files, public signing keys, scoped authorization, and broker audiences are intended to support compatible implementations without exposing complexity to ordinary creators and viewers.</p>
                </section>

                <section id="scope" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">V1 scope and limits</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">A focused proof, not universal content control.</h2>
                    <ul class="mt-6 space-y-3 text-sm leading-6 text-muted">
                        <li><strong class="text-ink">Primary scenario:</strong> several protected static images on an independently hosted gallery page, opened by a Chromium extension.</li>
                        <li><strong class="text-ink">Protection goal:</strong> raise the cost of anonymous bulk harvesting and make releases conditional and accountable.</li>
                        <li><strong class="text-ink">Not promised:</strong> perfect copy prevention, guaranteed humanity, one-human-one-account, moral trust, or protection from an authorized person.</li>
                        <li><strong class="text-ink">Deferred:</strong> additional content profiles, mobile/cross-browser Viewers, adaptive renditions, chunking, federation, and stronger optional personhood.</li>
                    </ul>
                </section>

                <section id="status" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Implementation status</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Foundations exist; the complete protection flow does not.</h2>
                    <div class="mt-7 overflow-hidden rounded-2xl border border-line">
                        @foreach ([
                            ['Implemented and tested', 'Versioned contracts and vectors; account authentication and passkeys; verified email; registered Viewer device keys; OAuth PKCE and DPoP; account closure, deletion, sanction retention, and backup-deletion replay.'],
                            ['Designed, not operational end to end', 'Isolated Key Broker, CTX policy/ticket/redemption control plane, Creator Studio, production Viewer extension, trusted rendering, metrics projections, and static reference Host.'],
                            ['Release gates remain', 'Fuzzing, compatibility benchmarks, independent security review, production topology, extension-store review, operational exercises, and complete threat-model evidence.'],
                        ] as $index => [$label, $copy])
                            <div class="grid gap-2 border-b border-line p-5 last:border-b-0 sm:grid-cols-[13rem_1fr] sm:p-6">
                                <p class="font-bold {{ $index === 0 ? 'text-teal-700' : ($index === 1 ? 'text-amber-700' : 'text-muted') }}">{{ $label }}</p>
                                <p class="text-sm leading-6 text-muted">{{ $copy }}</p>
                            </div>
                        @endforeach
                    </div>
                </section>

                <section id="design-sources" class="mt-20 scroll-mt-8 lg:mt-24">
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Design sources</p>
                    <h2 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">The detailed intent remains in living Markdown.</h2>
                    <p class="mt-5 max-w-3xl leading-7 text-muted">These are the authoritative design sources behind this overview. Repository links activate when the public source URL is configured.</p>
                    <ul class="mt-7 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                        @foreach ($sources as [$label, $path])
                            <li class="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <span class="font-bold text-ink">{{ $label }}</span>
                                @if ($repositoryUrl !== '')
                                    <a class="break-all font-mono text-xs text-brand hover:text-brand-strong" href="{{ $repositoryUrl }}/blob/main/{{ $path }}">{{ $path }}</a>
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
