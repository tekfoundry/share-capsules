@props(['id' => 'project-status'])

<section id="{{ $id }}" {{ $attributes->class(['border-y border-line bg-white py-16 sm:py-20']) }}>
    <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div class="max-w-3xl">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Project readiness</p>
            <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">What exists today—and what does not.</h2>
            <p class="mt-5 text-base leading-7 text-muted">Share Capsules is public experimental work, not a production content-protection service. These boundaries distinguish the intended destination from capabilities that have actually been built and tested.</p>
        </div>

        <dl class="mt-10 grid overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
            @foreach ([
                ['Long-term vision', 'An open ecosystem of portable Capsules, creator-selected compatible providers and brokers, and trusted Viewers across platforms.', 'text-violet-700'],
                ['Implemented and tested', 'Versioned Capsule and CTX contracts and vectors; account authentication, passkeys, verified email, Viewer device registration, OAuth protections, and account lifecycle controls.', 'text-teal-700'],
                ['Active development', 'The isolated Key Broker, CTX authorization and key-release flow, Creator Studio, Viewer extension, trusted rendering, metrics, and static reference Host.', 'text-amber-700'],
                ['Deferred beyond V1', 'Additional content profiles, mobile and cross-browser Viewers, adaptive renditions, chunking, provider federation, and stronger optional personhood evidence.', 'text-muted'],
            ] as [$term, $description, $color])
                <div class="bg-white p-6 md:p-7">
                    <dt class="font-bold {{ $color }}">{{ $term }}</dt>
                    <dd class="mt-3 text-sm leading-6 text-muted">{{ $description }}</dd>
                </div>
            @endforeach
        </dl>
    </div>
</section>
