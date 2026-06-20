@extends('layouts.app')

@section('title', 'Share Capsules — Protect the work. Share with intention.')
@section('description', 'Share Capsules is an experimental creator-controlled system for distributing encrypted content under explicit trust policies.')

@section('content')
    <section class="mx-auto grid max-w-7xl gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pt-28 lg:pb-28">
        <div>
            <div class="inline-flex items-center gap-2 rounded-full border border-teal-700/15 bg-teal-50 px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-teal-800 uppercase">
                <span class="size-1.5 rounded-full bg-teal-500" aria-hidden="true"></span>
                Creator-controlled access
            </div>

            <h1 class="mt-7 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl lg:text-7xl">
                Protect the work.<br>
                <span class="text-brand">Share with intention.</span>
            </h1>

            <p class="mt-7 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Package creative work as an encrypted Capsule, publish it anywhere, and let your signed access policy travel with it.
            </p>

            <div class="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                    href="#approach"
                    class="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    Explore the approach
                    <span aria-hidden="true">→</span>
                </a>
                <a
                    href="#project-status"
                    class="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                    See development status
                </a>
            </div>

            <dl class="mt-11 grid max-w-xl grid-cols-3 gap-5 border-t border-line pt-6">
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

    <section id="approach" class="border-y border-line bg-white py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="max-w-2xl">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">A portable protection model</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Ownership stays visible in the architecture.</h2>
                <p class="mt-5 text-lg leading-8 text-muted">Capsule and CTX separate content hosting, trust evaluation, and key release so no ordinary website needs to become the viewer’s identity provider.</p>
            </div>

            <div class="mt-12 grid gap-5 md:grid-cols-3">
                @foreach ([
                    ['01', 'Create locally', 'Trusted creator tooling encrypts the source, signs its manifest, and exports a portable Capsule.'],
                    ['02', 'Publish anywhere', 'The encrypted Capsule can live on an ordinary compatible static host selected by its creator.'],
                    ['03', 'Open intentionally', 'A trusted Viewer evaluates the signed policy before a device-bound content key is released.'],
                ] as [$number, $heading, $copy])
                    <article class="rounded-2xl border border-line bg-surface p-6 shadow-card">
                        <span class="text-xs font-bold tracking-[0.16em] text-brand uppercase">{{ $number }}</span>
                        <h3 class="mt-5 text-lg font-bold">{{ $heading }}</h3>
                        <p class="mt-3 text-sm leading-6 text-muted">{{ $copy }}</p>
                    </article>
                @endforeach
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
                    <p class="mt-3 text-sm leading-6 text-amber-950/75">Share Capsules is not yet ready to protect sensitive or irreplaceable content. The implementation is being built in public with automated protocol and security tests.</p>
                </div>
                <a class="shrink-0 text-sm font-bold text-amber-900 underline decoration-amber-400 underline-offset-4 hover:text-amber-700" href="mailto:info@tekfoundry.com">Questions or feedback</a>
            </div>
        </div>
    </section>
@endsection
