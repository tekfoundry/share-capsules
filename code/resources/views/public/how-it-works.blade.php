@extends('layouts.app')

@section('title', 'How Share Capsules works — Capsules, CTX, and trusted viewing')
@section('description', 'Follow protected content from local Capsule creation through independent hosting, CTX policy evaluation, broker key release, and local Viewer decryption.')

@section('content')
    <section class="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:px-10 lg:pt-28">
        <div>
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">How it works</p>
            <h1 class="mt-5 max-w-6xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">From original work to an authorized Viewer.</h1>
            <p class="mt-7 max-w-4xl text-lg leading-8 text-muted">Share Capsules separates content distribution from the decision to release a decryption key. Each participant has one bounded job, so an ordinary Host never needs the creator’s plaintext or the Viewer’s identity.</p>
            <p class="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase">
                <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
                Proposed complete flow — under active development
            </p>
        </div>

        <x-public.access-workflow class="mt-12" />
    </section>

    <section class="border-y border-line bg-white py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="max-w-3xl">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">The participants</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">One flow, deliberately separated responsibilities.</h2>
                <p class="mt-5 text-lg leading-8 text-muted">Share Capsules operates the first reference services, but Capsule and CTX are designed so creators can eventually recognize other compatible providers and brokers.</p>
            </div>

            <dl class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 xl:grid-cols-5">
                @foreach ([
                    ['Creator tool', 'Knows', 'The original work, creator signing key, policy, and freshly generated content key.', 'Produces the encrypted, signed Capsule locally.'],
                    ['Host', 'Stores', 'Public fallback content and the encrypted Capsule file.', 'Does not need a Share Capsules integration, Viewer identity, or plaintext.'],
                    ['Trusted Viewer', 'Controls', 'The Viewer account connection, consented evidence, device keys, released content key, and rendered plaintext.', 'Verifies before authorizing and isolates decrypted content from the Host page.'],
                    ['CTX Provider', 'Evaluates', 'The signed policy and only the account evidence needed for that request.', 'Returns an authorization result; it does not send raw account history to the creator or Host.'],
                    ['Key Broker', 'Releases', 'Protected content-key material, release state, and exact short-lived authorization.', 'Wraps the content key to the authorized Viewer device; it does not render the work.'],
                ] as [$term, $verb, $description, $boundary])
                    <div class="flex h-full flex-col bg-white p-6">
                        <dt class="text-lg font-bold text-ink">{{ $term }}</dt>
                        <dd class="mt-5 flex flex-1 flex-col">
                            <span class="text-xs font-bold tracking-[0.14em] text-brand uppercase">{{ $verb }}</span>
                            <p class="mt-2 pb-6 text-sm leading-6 text-muted">{{ $description }}</p>
                            <p class="mt-auto min-h-24 border-t border-line pt-4 text-xs leading-5 text-muted">{{ $boundary }}</p>
                        </dd>
                    </div>
                @endforeach
            </dl>
        </div>
    </section>

    <section class="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-10">
        <div class="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">At viewing time</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">The key moves only after the policy is satisfied.</h2>
                <p class="mt-5 text-base leading-7 text-muted">Downloading an encrypted Capsule is not itself a protected view. The content becomes readable only after authorization and device-bound key release.</p>
            </div>

            <ol class="space-y-4">
                @foreach ([
                    ['Verify before disclosure', 'The Viewer fetches the Capsule anonymously, validates its signature and declared policy, and rejects unsupported or modified packages before sharing account evidence.'],
                    ['Ask for informed consent', 'The Viewer explains which conditions will be evaluated and what a successful release may consume, such as a per-account or global view allowance.'],
                    ['Authorize the exact request', 'The CTX Provider evaluates the creator’s policy for this Capsule, revision, action, account, and registered device. Approval is short-lived and cannot authorize unrelated content.'],
                    ['Release and render locally', 'The Key Broker validates the authorization and wraps the content key to the Viewer device. The Viewer decrypts in its isolated surface; the Host does not receive the key or plaintext.'],
                ] as $index => [$heading, $copy])
                    <li class="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-[auto_1fr] sm:p-6">
                        <span class="grid size-9 place-items-center rounded-xl bg-brand/10 text-sm font-bold text-brand" aria-hidden="true">{{ $index + 1 }}</span>
                        <div>
                            <h3 class="font-bold text-ink">{{ $heading }}</h3>
                            <p class="mt-2 text-sm leading-6 text-muted">{{ $copy }}</p>
                        </div>
                    </li>
                @endforeach
            </ol>
        </div>
    </section>

    <x-public.project-status />

    <section class="border-t border-line bg-white py-16">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="grid gap-6 rounded-2xl border border-amber-300/45 bg-amber-50/70 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                    <h2 class="font-bold text-amber-950">What this architecture cannot promise</h2>
                    <p class="mt-3 max-w-4xl text-sm leading-6 text-amber-950/75">An authorized person can still photograph, record, reproduce, or misuse rendered content. Share Capsules aims to make anonymous bulk access harder and releases more accountable; it does not make visible work impossible to copy or prove future human intent.</p>
                </div>
                <a class="text-sm font-bold text-amber-900 underline decoration-amber-400 underline-offset-4 hover:text-amber-700" href="mailto:info@tekfoundry.com">Question the design</a>
            </div>
        </div>
    </section>
@endsection
