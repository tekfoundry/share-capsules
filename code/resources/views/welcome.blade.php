@extends('layouts.app')

@section('title', 'Share Capsules — Share your work with people, not harvesters')
@section('description', 'Share Capsules is an open, experimental approach to sharing encrypted creative work under creator-defined access conditions.')
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
                    href="#workflow"
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

            <dl class="mt-8 grid max-w-xl grid-cols-3 gap-5 border-t border-line pt-6">
                <div>
                    <dt class="text-xs font-semibold tracking-wide text-muted uppercase">Content</dt>
                    <dd class="mt-1 text-sm font-bold text-ink">Encrypted locally</dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold tracking-wide text-muted uppercase">Policy</dt>
                    <dd class="mt-1 text-sm font-bold text-ink">Creator signed</dd>
                </div>
                <div>
                    <dt class="text-xs font-semibold tracking-wide text-muted uppercase">Hosting</dt>
                    <dd class="mt-1 text-sm font-bold text-ink">Creator selected</dd>
                </div>
            </dl>
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
                <p class="mt-5 text-lg leading-8 text-muted">A Capsule carries encrypted content and a signed access policy. <strong class="font-semibold text-ink">Capsule Trust Exchange (CTX)</strong> is the open protocol a Viewer uses to ask a creator-recognized provider whether those access conditions are satisfied—without exposing the Viewer’s raw account history to the creator or Host. This separates hosting, trust evaluation, and key release so creators can choose where they publish.</p>
            </div>

            <div class="mt-12 grid gap-5 md:grid-cols-3">
                @foreach ([
                    ['01', 'Create a Capsule', 'Creator-controlled tooling encrypts the source, signs its manifest, and packages the access policy.'],
                    ['02', 'Host it independently', 'The encrypted file can live on an ordinary compatible static host chosen by the creator.'],
                    ['03', 'Authorize each release', 'A trusted Viewer uses CTX to satisfy the policy before decrypting and rendering locally.'],
                ] as [$number, $heading, $copy])
                    <article class="rounded-2xl border border-line bg-surface p-6 shadow-card">
                        <span class="text-xs font-bold tracking-[0.16em] text-brand uppercase">{{ $number }}</span>
                        <h3 class="mt-5 text-lg font-bold">{{ $heading }}</h3>
                        <p class="mt-3 text-sm leading-6 text-muted">{{ $copy }}</p>
                    </article>
                @endforeach
            </div>

            <x-public.access-workflow id="workflow" class="mt-16" />
        </div>
    </section>

    <section id="trust" class="border-b border-line bg-canvas py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
                <div>
                    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">How trust works</p>
                    <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Trust, without a universal trust score.</h2>
                    <p class="mt-5 text-base leading-7 text-muted">CTX does not decide whether someone is a “good” or “trustworthy” person. Each creator defines the conditions required for their Capsule. A recognized provider evaluates only the relevant, Viewer-consented evidence and returns whether those conditions are satisfied.</p>
                </div>

                <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
                    <ol class="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        @foreach ([
                            ['01', 'Creator chooses', 'The Capsule carries the creator’s signed access conditions.'],
                            ['02', 'Viewer consents', 'The Viewer decides whether to disclose the evidence needed for this request.'],
                            ['03', 'Provider evaluates', 'The provider returns a limited policy result rather than a raw account history.'],
                        ] as [$number, $heading, $copy])
                            <li class="p-5 sm:p-6">
                                <span class="text-xs font-bold tracking-[0.14em] text-brand uppercase">{{ $number }}</span>
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
                </div>
            </div>
        </div>
    </section>

    <section id="boundaries" class="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div class="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Designed for clarity</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Security without mystery.</h2>
                <p class="mt-5 text-base leading-7 text-muted">The interface should explain what is happening, who receives information, and what an authorization consumes—without exposing raw trust history to creators or Hosts.</p>
            </div>

            <dl class="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
                @foreach ([
                    ['Host website', 'Serves public fallback and opaque encrypted Capsule files.'],
                    ['Trusted Viewer', 'Validates, authorizes, decrypts, and renders in an isolated surface.'],
                    ['CTX Provider', 'Evaluates the exact creator-signed policy using consented evidence.'],
                    ['Key Broker', 'Releases only the ticket-bound content key to the registered device.'],
                ] as [$term, $description])
                    <div class="bg-white p-6">
                        <dt class="font-bold text-ink">{{ $term }}</dt>
                        <dd class="mt-2 text-sm leading-6 text-muted">{{ $description }}</dd>
                    </div>
                @endforeach
            </dl>
        </div>
    </section>

    <x-public.project-status />

    <x-public.project-participation />
@endsection
