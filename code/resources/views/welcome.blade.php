@extends('layouts.app')

@section('title', 'Share Capsules — Share your work with people, not harvesters')
@section('description', 'Share Capsules is an open, experimental approach to sharing encrypted creative work through an opinionated official network of recognized trust and key-release services.')
@section('robots', 'index, follow')

@section('content')
    <section class="mx-auto grid max-w-7xl gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pt-28 lg:pb-28">
        <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-teal-700/15 bg-teal-50 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-teal-800 uppercase">
                <span class="size-1.5 rounded-full bg-teal-500" aria-hidden="true"></span>
                For creators who still want to share
            </div>

            <h1 class="mt-7 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
                Share your work with people.<br>
                <span class="text-brand">Not with every machine that asks.</span>
            </h1>

            <p class="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Publishing online should not automatically grant scrapers, bulk collectors, and AI training pipelines unrestricted access to your work. Share Capsules is exploring a more intentional way to publish.
            </p>

            <div class="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                    href="#lifecycle"
                    class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    See how it could work
                    <span aria-hidden="true">→</span>
                </a>
                <a
                    href="#project-status"
                    class="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    Follow the project
                </a>
            </div>

            <p class="mt-7 max-w-2xl border-l-2 border-amber-400 pl-4 text-sm leading-6 text-muted">
                <strong class="text-ink">An honest boundary:</strong> no technology can prevent an authorized viewer from copying what they can see. The goal is to make effortless, anonymous, large-scale access harder—not to promise impossible DRM.
            </p>

            <ul class="mt-8 grid max-w-2xl grid-cols-2 gap-5 border-t border-line pt-6 sm:grid-cols-4">
                <li class="flex items-start gap-3">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface" aria-hidden="true">
                        <x-public.icons.artwork class="size-7" />
                    </span>
                    <div>
                        <p class="text-xs font-semibold tracking-wide text-muted uppercase">Content</p>
                        <p class="mt-1 text-sm font-bold text-ink">Encrypted locally</p>
                    </div>
                </li>
                <li class="flex items-start gap-3">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface" aria-hidden="true">
                        <x-public.icons.policy class="size-7" />
                    </span>
                    <div>
                        <p class="text-xs font-semibold tracking-wide text-muted uppercase">Policy</p>
                        <p class="mt-1 text-sm font-bold text-ink">Creator-defined</p>
                    </div>
                </li>
                <li class="flex items-start gap-3">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface" aria-hidden="true">
                        <x-public.icons.host class="size-7" />
                    </span>
                    <div>
                        <p class="text-xs font-semibold tracking-wide text-muted uppercase">Hosting</p>
                        <p class="mt-1 text-sm font-bold text-ink">Encrypted only</p>
                    </div>
                </li>
                <li class="flex items-start gap-3">
                    <span class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface" aria-hidden="true">
                        <x-public.icons.trusted-viewer class="size-7" />
                    </span>
                    <div>
                        <p class="text-xs font-semibold tracking-wide text-muted uppercase">Viewer</p>
                        <p class="mt-1 text-sm font-bold text-ink">Policy-gated</p>
                    </div>
                </li>
            </ul>
        </div>

        <x-public.access-architecture />
    </section>

    <section id="problem" class="border-y border-artifact-line bg-artifact py-20 text-white sm:py-24">
        <div class="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:px-10">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-violet-300 uppercase">The problem</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">The web asks creators to choose between reach and control.</h2>
                <p class="mt-5 text-base leading-7 text-slate-300">Public work is easy for people to discover—and just as easy for automated systems to scrape, aggregate, archive, republish, and train on without meaningful permission.</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
                @foreach ([
                    ['Publish', 'Creators want their work to be seen, discussed, and enjoyed by real audiences.'],
                    ['Lose control', 'A public URL usually gives human visitors and industrial harvesters the same access.'],
                    ['Accept lock-in', 'Private platforms add gates, but often require the creator to surrender hosting and audience relationships.'],
                ] as [$heading, $copy])
                    <article class="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                        <h3 class="font-bold text-white">{{ $heading }}</h3>
                        <p class="mt-3 text-sm leading-6 text-slate-300">{{ $copy }}</p>
                    </article>
                @endforeach
            </div>
        </div>
    </section>

    <section id="approach" class="border-b border-line bg-white py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="max-w-2xl">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">What we are building</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Encrypted content with creator-defined access.</h2>
                <p class="mt-5 text-lg leading-8 text-muted">Share Capsules separates protected content from public hosting. Creators secure the work, publish the encrypted file where they choose, and let the Viewer ask trusted services whether the work should open.</p>
            </div>

            <div class="mt-12 grid gap-5 md:grid-cols-3">
                @foreach ([
                    ['01', 'capsule', 'Secure content', 'The creator tool turns the original work into a Capsule: encrypted content plus a custom trust policy.'],
                    ['02', 'host', 'Publish content', 'The encrypted Capsule can be hosted on an ordinary website chosen by the creator.'],
                    ['03', 'trusted-viewer', 'View content', 'A trusted Viewer checks whether the visitor meets the policy before decrypting and rendering the original work locally.'],
                ] as [$number, $icon, $heading, $copy])
                    <article class="rounded-2xl border border-line bg-surface p-6 shadow-card">
                        <div class="flex items-start justify-between gap-4">
                            <span class="text-xs font-bold tracking-[0.16em] text-brand uppercase">{{ $number }}</span>
                            <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white" aria-hidden="true">
                                <x-dynamic-component :component="'public.icons.'.$icon" class="size-10" />
                            </span>
                        </div>
                        <h3 class="mt-4 text-lg font-bold">{{ $heading }}</h3>
                        <p class="mt-3 text-sm leading-6 text-muted">{{ $copy }}</p>
                    </article>
                @endforeach
            </div>

            <p class="mt-8 max-w-3xl text-base leading-7 text-muted"><strong class="font-semibold text-ink">Capsule Trust Exchange (CTX)</strong> is the open protocol behind that approval step. It lets a Viewer ask whether the creator’s access rules are met without exposing the Viewer’s raw account history to the creator or Host.</p>
        </div>
    </section>

    <x-public.lifecycle-section />

    <x-public.capsule-gate-explainer surface-class="bg-white" />

    <section class="border-b border-line bg-white py-16 sm:py-20">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="rounded-2xl border border-line bg-canvas p-6 sm:p-7">
                <div class="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                    <div>
                        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Open protocol, trusted providers</p>
                        <h3 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">Anyone can build. Official tools choose carefully.</h3>
                    </div>
                    <p class="text-sm leading-6 text-muted">Independent projects can build with Capsule and CTX. The official Share Capsules tools use approved network services by default, so creators and viewers are not asked to rely on random providers just because they appear on a web page.</p>
                </div>
            </div>
        </div>
    </section>

    <section id="trust" class="border-b border-line bg-canvas py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
                <div>
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">How trust works</p>
                    <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Trust, without a universal trust score.</h2>
                    <p class="mt-5 text-base leading-7 text-muted">CTX does not decide whether someone is a “good” or “trustworthy” person. It checks only the conditions the creator set for this Capsule, using information the Viewer agrees to share.</p>
                </div>

                <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <ol class="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        @foreach ([
                            ['01', 'policy', 'Creator chooses', 'The Capsule carries the creator’s signed access conditions.'],
                            ['02', 'viewer', 'Viewer consents', 'The Viewer decides whether to disclose the evidence needed for this request.'],
                            ['03', 'trust-provider', 'Provider evaluates', 'The provider returns a limited policy result rather than a raw account history.'],
                        ] as [$number, $icon, $heading, $copy])
                            <li class="p-5 sm:p-6">
                                <div class="flex items-start justify-between gap-4">
                                    <span class="text-xs font-bold tracking-[0.14em] text-brand uppercase">{{ $number }}</span>
                                    <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface" aria-hidden="true">
                                        <x-dynamic-component :component="'public.icons.'.$icon" class="size-9" />
                                    </span>
                                </div>
                                <h3 class="mt-3 font-bold text-ink">{{ $heading }}</h3>
                                <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                            </li>
                        @endforeach
                    </ol>

                    <div class="border-t border-line bg-surface p-5 sm:p-6">
                        <p class="text-xs font-bold tracking-[0.14em] text-muted uppercase">A policy may ask for</p>
                        <ul class="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-ink" aria-label="Example trust conditions">
                            @foreach (['Verified active account', 'Registered Viewer device', 'Account continuity', 'Per-Capsule limits', 'Low automation risk', 'Optional community standing'] as $condition)
                                <li class="rounded-full border border-line bg-white px-3 py-1.5">{{ $condition }}</li>
                            @endforeach
                        </ul>
                        <p class="mt-5 border-l-2 border-teal-500 pl-4 text-sm leading-6 text-muted"><strong class="text-ink">The creator receives the policy result</strong>—not the Viewer’s email, identity, complete history, or raw evidence.</p>
                    </div>

                    <div class="border-t border-line bg-white p-5 sm:p-6">
                        <p class="text-xs font-bold tracking-[0.14em] text-muted uppercase">Recognized services</p>
                        <p class="mt-3 text-sm leading-6 text-muted">Official Viewers only work with services the network recognizes. If a service is no longer trusted, the Viewer can stop before sharing private account information or opening the protected work.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section id="boundaries" class="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:px-10">
        <div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Designed for clarity</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Security without mystery.</h2>
                <p class="mt-5 text-sm leading-6 text-muted">Each part has a bounded job, so creators and viewers can understand who sees what.</p>
            </div>

            <div class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                @foreach ([
                    ['host', 'Host website', 'Serves public fallback and opaque encrypted Capsule files.'],
                    ['trusted-viewer', 'Trusted Viewer', 'Validates, authorizes, decrypts, and renders in an isolated surface.'],
                    ['registry', 'Official registry', 'Identifies which providers and brokers the official tools recognize.'],
                    ['ctx-protocol', 'CTX Protocol', 'Coordinates the Viewer, provider, and broker requests without giving the Host plaintext access.'],
                    ['trust-provider', 'Trust Provider', 'Evaluates the exact creator-signed policy using consented evidence.'],
                    ['key-broker', 'Key Broker', 'Releases only the ticket-bound content key to the registered device.'],
                ] as [$icon, $term, $description])
                    <article class="flex gap-4 bg-white p-5">
                        <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface" aria-hidden="true">
                            <x-dynamic-component :component="'public.icons.'.$icon" class="size-9" />
                        </span>
                        <div>
                            <h3 class="font-bold text-ink">{{ $term }}</h3>
                            <p class="mt-2 text-sm leading-6 text-muted">{{ $description }}</p>
                        </div>
                    </article>
                @endforeach
            </div>
        </div>
    </section>

    <x-public.project-status />

    <x-public.project-participation />
@endsection
