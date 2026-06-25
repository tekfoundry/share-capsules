@props([
    'showHeader' => true,
    'intro' => 'Share Capsules separates the act of publishing from the decision to unlock. Creators keep their work portable, while Viewers open it through trusted services that check access before anything protected is shown.',
    'surfaceClass' => 'bg-[#eef3f8]',
])

<section
    id="{{ $attributes->get('id', 'lifecycle') }}"
    {{ $attributes->except('id')->merge(['class' => 'border-b border-line '.$surfaceClass.' py-20 sm:py-24']) }}
    aria-labelledby="{{ $attributes->get('id', 'lifecycle') }}-title"
>
    <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        @if ($showHeader)
            <div class="max-w-3xl">
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">The complete journey</p>
                <h2 id="{{ $attributes->get('id', 'lifecycle') }}-title" class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">From original work to a trusted viewing session.</h2>
                <p class="mt-5 text-base leading-7 text-muted">{{ $intro }}</p>
            </div>
        @else
            <p id="{{ $attributes->get('id', 'lifecycle') }}-title" class="sr-only">Share Capsules lifecycle steps</p>
            @if ($intro)
                <p class="max-w-3xl text-base leading-7 text-muted">{{ $intro }}</p>
            @endif
        @endif

        <div class="{{ $showHeader || $intro ? 'mt-10' : '' }} overflow-hidden rounded-2xl border border-teal-900/10 bg-white shadow-card">
            @foreach ([
                ['01', 'Creator', 'Content creation', 'The creator makes the work with the tools they already use, whether that means images, video, HTML, PDFs, or another format they want to share more intentionally.'],
                ['02', 'Creator', 'Capsule creation', 'The creator tool wraps the work in an encrypted Capsule and signs the trust policy, so the package carries clear instructions about how it may be opened.'],
                ['03', 'Creator', 'Publish capsule', 'The encrypted Capsule can be placed on an ordinary website. The Host can share the file, but it cannot read the protected content inside it.'],
                ['04', 'Viewer', 'Connection', 'A Viewer connects through the official tool, reviews the access requirements, and chooses whether to opt in to this Capsule’s trust policy.'],
                ['05', 'Viewer', 'Policy check', 'A trusted provider checks only what this Capsule requires, such as account status, consent, limits, or creator-selected conditions.'],
                ['06', 'Viewer', 'Key release', 'If access is approved, the broker releases a one-time opening key to that connected Viewer. The Host never receives it.'],
                ['07', 'Viewer', 'Decryption', 'The Viewer opens the Capsule locally and shows the protected work inside its own trusted viewing surface.'],
            ] as [$number, $side, $heading, $copy])
                @if ($number === '04')
                    <div class="border-t border-line bg-surface px-6 py-4 text-center">
                        <p class="text-xs font-bold tracking-[0.16em] text-muted uppercase">When someone visits the hosted page</p>
                    </div>
                @endif
                <article class="grid border-t border-line first:border-t-0 lg:grid-cols-2">
                    <div class="flex min-h-56 items-center justify-center bg-artifact p-8 text-white">
                        @if ($number === '01')
                            <x-public.lifecycle-original-content class="h-52 w-64 max-w-full" />
                        @elseif ($number === '02')
                            <x-public.lifecycle-capsule-content />
                        @elseif ($number === '03')
                            <x-public.lifecycle-hosted-capsule />
                        @elseif ($number === '04')
                            <x-public.lifecycle-viewer-connection />
                        @elseif ($number === '05')
                            <x-public.lifecycle-trust-provider />
                        @elseif ($number === '06')
                            <x-public.lifecycle-license-broker />
                        @elseif ($number === '07')
                            <x-public.lifecycle-decryption />
                        @else
                            <div class="relative flex aspect-square w-44 max-w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.045]">
                                <div class="absolute inset-5 rounded-full border border-dashed border-teal-300/40"></div>
                                <div class="text-center">
                                    <p class="text-xs font-bold tracking-[0.18em] text-teal-200 uppercase">{{ $side }}</p>
                                    <p class="mt-3 text-5xl font-semibold tracking-[-0.045em]">{{ $number }}</p>
                                </div>
                            </div>
                        @endif
                    </div>
                    <div class="flex min-h-56 flex-col justify-center p-6 sm:p-8">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">{{ $side }} workflow</p>
                            <p class="rounded-full bg-artifact px-3 py-1 text-xs font-bold tracking-[0.12em] text-slate-100 uppercase">Step {{ (int) $number }}</p>
                        </div>
                        <h3 class="mt-3 text-2xl font-semibold tracking-[-0.025em] text-ink">{{ $heading }}</h3>
                        <p class="mt-4 text-base leading-7 text-muted">{{ $copy }}</p>
                    </div>
                </article>
            @endforeach
        </div>
    </div>
</section>
