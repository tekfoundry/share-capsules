@php
    $repositoryUrl = rtrim((string) config('sharecapsules.public.repository_url'), '/');
@endphp

<section id="participate" class="border-t border-line bg-canvas py-16 sm:py-20">
    <div class="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-10">
        <div>
            <a class="inline-block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" href="https://tekfoundry.com" target="_blank" rel="noopener noreferrer">
                <img class="h-9 w-auto sm:h-10" src="https://tekfoundry.com/imgs/tekfoundry/logo_horz_black.png" alt="TekFoundry" width="1000" height="242" loading="lazy" decoding="async">
            </a>
            <p class="mt-5 max-w-md text-sm leading-6 text-muted">TekFoundry sponsors and currently develops the Share Capsules reference implementation.</p>
        </div>

        <div>
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Open participation</p>
            <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Built in public. Improved through scrutiny.</h2>
            <p class="mt-5 max-w-3xl text-base leading-7 text-muted">Capsule and CTX are intended to support interoperable implementations—not make TekFoundry the only possible provider or broker. Creators, implementers, privacy advocates, and security reviewers are invited to question the assumptions and improve the design.</p>

            <div class="mt-7 flex flex-col gap-3 sm:flex-row">
                <a class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="mailto:info@tekfoundry.com?subject=Share%20Capsules%20feedback">Send feedback</a>
                <a class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-brand/30 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" href="{{ $repositoryUrl }}" target="_blank" rel="noopener noreferrer">
                    Review the project on GitHub
                </a>
            </div>
        </div>
    </div>
</section>
