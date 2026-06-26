@props([
    'id' => 'capsule-access-rules',
    'surfaceClass' => 'bg-white',
])

<section id="{{ $id }}" {{ $attributes->merge(['class' => 'border-b border-line '.$surfaceClass.' py-20 sm:py-24']) }} aria-labelledby="{{ $id }}-title">
    <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div class="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
                <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Capsule access rules</p>
                <h2 id="{{ $id }}-title" class="mt-4 text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">One Capsule format, several ways to decide when it opens.</h2>
                <p class="mt-5 text-base leading-7 text-muted">Capsules can be configured with time, limit, and trust policies. These policies can be used alone or combined to define the access rules for decryption. The Viewer opens the encrypted content only when every required policy is satisfied.</p>
                <p class="mt-4 text-sm leading-6 text-muted">A Time Capsule, Limit Capsule, Trust Capsule, or Combined Capsule allows creators to configure how they want their protected content shared.</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
                @foreach ([
                    ['time-capsule', 'Time Capsule', 'Allows creators to set opening and closing dates. The Capsule opens only during that configured access window.'],
                    ['limit-capsule', 'Limit Capsule', 'Allows creators to limit how many times protected content can be viewed, either across all viewers or per viewer account.'],
                    ['trust-capsule', 'Trust Capsule', 'Allows creators to require a viewer trust check before content opens. The trust score considers recent usage patterns and quick human challenges that help distinguish people from bots.'],
                    ['combined-capsule', 'Combined Capsule', 'Combines selected rules so time, limit, and trust requirements must all pass before the key is released.'],
                ] as [$icon, $heading, $copy])
                    <article class="rounded-2xl border border-line bg-white p-6 shadow-card">
                        <span class="flex size-12 items-center justify-center rounded-xl bg-surface" aria-hidden="true">
                            <x-dynamic-component :component="'public.icons.'.$icon" class="size-10" />
                        </span>
                        <h3 class="mt-4 text-lg font-bold text-ink">{{ $heading }}</h3>
                        <p class="mt-3 text-sm leading-6 text-muted">{{ $copy }}</p>
                    </article>
                @endforeach
            </div>
        </div>

        <div class="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-7">
            <p class="text-xs font-bold tracking-[0.14em] text-muted uppercase">At viewing time</p>
            <div class="mt-5 grid gap-4 text-sm leading-6 text-muted md:grid-cols-4">
                @foreach ([
                    ['Opens normally', 'The current time, counters, account, device, and trust checks satisfy the signed policy.'],
                    ['Locked by rule', 'A time window has not started, has ended, or an opening limit has already been reached.'],
                    ['Quick check needed', 'The viewer is otherwise eligible, but current confidence is too low to release the key yet.'],
                    ['Blocked for risk', 'Recent high automation-risk behavior can keep access blocked even if a challenge is attempted.'],
                ] as [$heading, $copy])
                    <div class="rounded-xl bg-white p-4">
                        <h3 class="font-bold text-ink">{{ $heading }}</h3>
                        <p class="mt-2">{{ $copy }}</p>
                    </div>
                @endforeach
            </div>
            <p class="mt-5 border-l-2 border-amber-400 pl-4 text-sm leading-6 text-muted">Trust checks help reduce automated access, but they are not a perfect guarantee. They do not prove that a viewer is a unique person, generally trustworthy, or guaranteed to use the content well.</p>
        </div>
    </div>
</section>
