@extends('layouts.app')

@section('title', 'How Share Capsules works — Capsules, CTX, and trusted viewing')
@section('description', 'Follow protected content from local Capsule creation through independent hosting, CTX policy evaluation, broker key release, and local Viewer decryption.')
@section('robots', 'index, follow')

@section('content')
    <div class="bg-[radial-gradient(circle_at_75%_0%,rgba(37,99,235,0.10),transparent_36%),radial-gradient(circle_at_12%_0%,rgba(13,148,136,0.08),transparent_30%)]">
        <section class="mx-auto max-w-7xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24 sm:pb-12 lg:px-10 lg:pt-28">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">How it works</p>
                <h1 class="mt-5 max-w-6xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">From original work to a trusted viewing session.</h1>
                <p class="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1.5 text-xs font-bold tracking-wide text-amber-900 uppercase">
                    <span class="size-1.5 rounded-full bg-amber-500" aria-hidden="true"></span>
                    Proposed complete flow — under active development
                </p>
            </div>
        </section>

        <x-public.lifecycle-section :show-header="false" surface-class="bg-transparent" class="pt-0 sm:pt-0" />
    </div>

    <x-public.capsule-gate-explainer surface-class="bg-white" />

    <section class="border-y border-line bg-white py-20 sm:py-24">
        <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div class="max-w-3xl">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">The participants</p>
                <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">One flow, deliberately separated responsibilities.</h2>
                <p class="mt-5 text-base leading-7 text-muted">The journey works because each participant has a narrow job.</p>
                <p class="mt-5 text-lg leading-8 text-muted">Share Capsules operates the first reference services, but Capsule and CTX are designed as an open protocol. Official tools can choose recognized providers and brokers without forcing every implementation into one closed ecosystem.</p>
            </div>

            <div class="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 xl:grid-cols-3">
                @foreach ([
                    ['creator', 'Creator', 'Creates', 'Original work using the tools they already know, such as image, video, HTML, PDF, or other supported formats.', 'Chooses what they want to share more intentionally.'],
                    ['capsule', 'Creator tool', 'Secures', 'The original work, creator signing key, trust policy, and freshly generated content key.', 'Produces the encrypted, policy-bearing Capsule locally.'],
                    ['host', 'Host website', 'Publishes', 'Public fallback content and the encrypted Capsule file.', 'Can distribute the Capsule without needing Viewer identity, the key, or plaintext.'],
                    ['viewer', 'Viewer', 'Requests', 'A person visits the hosted page and asks to open the Capsule through a compatible Viewer.', 'Starts as an ordinary visitor until the policy and key path complete.'],
                    ['registry', 'Official registry', 'Recognizes', 'The providers and brokers that official tools are willing to use by default.', 'Lets official Viewers refuse unknown, suspended, or revoked services before private information is shared.'],
                    ['ctx-protocol', 'CTX Protocol', 'Coordinates', 'The policy check and key-release conversation between the Viewer, provider, and broker.', 'Keeps the Host out of the trust and key path.'],
                    ['trust-provider', 'Trust Provider', 'Evaluates', 'The trust policy and only the consented evidence needed for that request.', 'Returns a limited policy result instead of raw account history.'],
                    ['key-broker', 'Key Broker', 'Releases', 'Protected content-key material, release state, and exact short-lived authorization.', 'Wraps the content key to the authorized Viewer device; it does not render the work.'],
                    ['trusted-viewer', 'Trusted Viewer', 'Opens', 'The account connection, consented evidence, device keys, released content key, and rendered plaintext.', 'Coordinates access and decrypts locally, outside the Host page.'],
                ] as [$icon, $term, $verb, $description, $boundary])
                    <article class="flex h-full gap-4 bg-white p-6">
                        <span class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface" aria-hidden="true">
                            <x-dynamic-component :component="'public.icons.'.$icon" class="size-10" />
                        </span>
                        <div class="flex min-w-0 flex-1 flex-col">
                        <h3 class="text-lg font-bold text-ink">{{ $term }}</h3>
                        <div class="mt-5 flex flex-1 flex-col">
                            <span class="text-xs font-bold tracking-[0.14em] text-brand uppercase">{{ $verb }}</span>
                            <p class="mt-2 pb-6 text-sm leading-6 text-muted">{{ $description }}</p>
                            <p class="mt-auto min-h-24 border-t border-line pt-4 text-xs leading-5 text-muted">{{ $boundary }}</p>
                        </div>
                        </div>
                    </article>
                @endforeach
            </div>
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
                    ['capsule', 'Verify before disclosure', 'The Viewer fetches the Capsule, validates its signature and declared trust policy, and checks that the required services are recognized before sharing account evidence.'],
                    ['trusted-viewer', 'Ask for informed consent', 'The Viewer explains which policy conditions will be checked and asks whether the visitor wants to opt in for this opening.'],
                    ['trust-provider', 'Authorize the exact request', 'The Trust Provider evaluates the creator’s policy for this Capsule, revision, action, account, and registered device. Approval is short-lived and cannot authorize unrelated content.'],
                    ['key-broker', 'Release and render locally', 'The Key Broker validates the authorization and wraps the content key to the Viewer device. The Viewer decrypts in its isolated surface; the Host does not receive the key or plaintext.'],
                ] as $index => [$icon, $heading, $copy])
                    <li class="grid gap-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:grid-cols-[auto_1fr] sm:p-6">
                        <span class="grid size-12 place-items-center rounded-xl bg-surface" aria-hidden="true">
                            <x-dynamic-component :component="'public.icons.'.$icon" class="size-10" />
                        </span>
                        <div>
                            <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">Step {{ $index + 1 }}</p>
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
