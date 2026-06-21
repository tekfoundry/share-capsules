@extends('layouts.app')

@section('title', 'Share Capsules — Share your work with people, not harvesters')
@section('description', 'Share Capsules is an open, experimental approach to sharing encrypted creative work under creator-defined access conditions.')

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

        <div class="relative mx-auto w-full max-w-xl lg:mx-0 lg:justify-self-end">
            <div class="absolute -inset-6 -z-10 rounded-[2.5rem] bg-brand/5 blur-2xl" aria-hidden="true"></div>
            <div class="overflow-hidden rounded-[1.75rem] border border-artifact-line bg-artifact text-white shadow-2xl shadow-slate-950/20">
                <div class="flex items-center justify-between border-b border-artifact-line px-5 py-4 sm:px-6">
                    <div class="flex items-center gap-3">
                        <span class="grid size-8 place-items-center rounded-lg border border-amber-400/40 bg-amber-400/10 text-amber-300">
                            <span class="h-3.5 w-2 rounded-[0.25rem] border-2 border-current border-r-0" aria-hidden="true"></span>
                        </span>
                        <div>
                            <p class="text-[0.68rem] font-bold tracking-[0.16em] text-violet-300 uppercase">Protected Capsule</p>
                            <p class="mt-0.5 text-sm font-semibold">Quiet Geometry</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center gap-1.5 rounded-full border border-teal-300/20 bg-teal-300/10 px-2.5 py-1 text-xs font-semibold text-teal-200">
                        <span class="size-1.5 rounded-full bg-teal-300" aria-hidden="true"></span>
                        Ready
                    </span>
                </div>

                <div class="grid gap-6 p-5 sm:grid-cols-[0.82fr_1.18fr] sm:p-6">
                    <div class="relative aspect-[4/5] overflow-hidden rounded-xl border border-amber-300/20 bg-[#111f38] shadow-[0_0_28px_rgba(245,158,11,0.12)]">
                        <div class="absolute -top-[18%] -left-[28%] size-[95%] rounded-full bg-[#e8dfcd]"></div>
                        <div class="absolute top-[34%] left-0 h-[34%] w-[58%] bg-[#b94f2c]"></div>
                        <div class="absolute right-0 bottom-0 h-[70%] w-[44%] bg-[#172945]"></div>
                        <div class="absolute inset-0 opacity-25 mix-blend-soft-light [background-image:url('data:image/svg+xml,%3Csvg_viewBox=%220_0_180_220%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%22.8%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22_opacity=%22.45%22/%3E%3C/svg%3E')]" aria-hidden="true"></div>
                        <span class="absolute right-3 bottom-3 rounded-md bg-slate-950/70 px-2 py-1 text-[0.62rem] font-bold tracking-wider text-white uppercase backdrop-blur">Encrypted</span>
                    </div>

                    <div class="flex flex-col">
                        <p class="text-xs font-bold tracking-[0.14em] text-violet-300 uppercase">Access policy</p>
                        <p class="mt-3 text-lg font-semibold">A clear boundary around every release.</p>
                        <p class="mt-2 text-sm leading-6 text-slate-300">
                            The content stays opaque until the Viewer validates its signed policy and receives a device-bound key release.
                        </p>

                        <div class="mt-5 space-y-2.5 text-xs font-semibold text-slate-200">
                            <div class="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2.5">
                                <span>Verified account</span>
                                <span class="text-teal-300">Required</span>
                            </div>
                            <div class="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2.5">
                                <span>Registered device</span>
                                <span class="text-teal-300">Required</span>
                            </div>
                            <div class="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.035] px-3 py-2.5">
                                <span>Release accounting</span>
                                <span class="text-amber-300">Consent</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-3 border-t border-artifact-line bg-[#091429] px-5 py-4 text-xs text-slate-400 sm:px-6">
                    <span class="text-amber-300" aria-hidden="true">◆</span>
                    Plaintext remains inside trusted Viewer memory.
                </div>
            </div>
        </div>
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

            <figure id="workflow" class="mt-16 scroll-mt-6 overflow-hidden rounded-[1.75rem] border border-artifact-line bg-artifact text-white shadow-2xl shadow-slate-950/15">
                <figcaption class="border-b border-artifact-line px-5 py-6 sm:px-7">
                    <p class="text-xs font-bold tracking-[0.16em] text-violet-300 uppercase">Creator to Viewer</p>
                    <div class="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <h3 class="text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Protected content moves. Control stays visible.</h3>
                        <p class="max-w-xl text-sm leading-6 text-slate-300">The Host distributes an encrypted file. CTX evaluates access. The Key Broker releases only to an authorized device. The Viewer decrypts locally.</p>
                    </div>
                </figcaption>

                <ol class="grid md:grid-cols-3 xl:grid-cols-6" aria-label="Share Capsules access workflow">
                    @foreach ([
                        ['01', 'Creator tool', 'Encrypt + sign', 'Creates a Capsule locally from the original work.', 'Creator controlled'],
                        ['02', 'Compatible Host', 'Serve ciphertext', 'Publishes the opaque Capsule file at an ordinary URL.', 'Public distribution'],
                        ['03', 'Trusted Viewer', 'Fetch + verify', 'Reads the signed policy and asks before disclosing evidence.', 'Viewer controlled'],
                        ['04', 'CTX Provider', 'Evaluate policy', 'Checks the creator’s conditions using consented evidence.', 'Trust decision'],
                        ['05', 'Key Broker', 'Release to device', 'Validates authorization and wraps the content key to the Viewer.', 'Key boundary'],
                        ['06', 'Trusted Viewer', 'Decrypt + render', 'Opens the content only inside the isolated Viewer surface.', 'Plaintext boundary'],
                    ] as $step)
                        <li class="group relative border-b border-artifact-line p-5 md:border-r md:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(3n)]:border-r xl:last:border-r-0 sm:p-6">
                            <div class="flex items-center justify-between gap-3">
                                <span class="text-xs font-bold tracking-[0.14em] text-violet-300 uppercase">{{ $step[0] }}</span>
                                <span class="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[0.62rem] font-semibold tracking-wide text-slate-300 uppercase">{{ $step[4] }}</span>
                            </div>
                            <p class="mt-6 text-xs font-bold tracking-[0.12em] text-amber-300 uppercase">{{ $step[1] }}</p>
                            <h4 class="mt-2 text-base font-bold text-white">{{ $step[2] }}</h4>
                            <p class="mt-3 text-sm leading-6 text-slate-300">{{ $step[3] }}</p>
                            @unless ($loop->last)
                                <span class="absolute top-1/2 -right-3 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-artifact-line bg-[#152442] text-xs text-teal-300 xl:grid" aria-hidden="true">→</span>
                            @endunless
                        </li>
                    @endforeach
                </ol>

                <div class="grid border-t border-artifact-line bg-[#091429] text-xs leading-5 text-slate-300 sm:grid-cols-3">
                    <p class="border-b border-artifact-line px-5 py-4 sm:border-r sm:border-b-0"><strong class="text-white">Host:</strong> stores and serves encrypted bytes.</p>
                    <p class="border-b border-artifact-line px-5 py-4 sm:border-r sm:border-b-0"><strong class="text-white">Provider:</strong> returns a limited policy decision.</p>
                    <p class="px-5 py-4"><strong class="text-white">Viewer:</strong> receives the key and protects plaintext.</p>
                </div>
            </figure>
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

    <section id="project-status" class="border-t border-line bg-white py-16">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="flex flex-col gap-6 rounded-2xl border border-amber-300/45 bg-amber-50/70 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
                <div class="max-w-3xl">
                    <div class="flex items-center gap-2 text-sm font-bold text-amber-900">
                        <span class="size-2 rounded-full bg-amber-500" aria-hidden="true"></span>
                        Active experimental development
                    </div>
                <p class="mt-3 text-sm leading-6 text-amber-950/75">The account and protocol foundations are being implemented and tested, but the complete creator-to-viewer protection flow does not exist yet. Share Capsules is not ready to protect sensitive or irreplaceable content.</p>
                </div>
                <a class="shrink-0 text-sm font-bold text-amber-900 underline decoration-amber-400 underline-offset-4 hover:text-amber-700" href="mailto:info@tekfoundry.com">Questions or feedback</a>
            </div>
        </div>
    </section>
@endsection
