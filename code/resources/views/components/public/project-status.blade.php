@props(['id' => 'project-status'])

<section id="{{ $id }}" {{ $attributes->class(['border-y border-line bg-white py-16 sm:py-20']) }}>
    <div class="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div class="max-w-3xl">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Available now</p>
            <h2 class="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Secure image sharing is ready to use.</h2>
            <p class="mt-5 text-base leading-7 text-muted">Create an account, protect an image, publish the protected Capsule on your site, and let eligible viewers open it with the Share Capsules Viewer. The hosted Share Capsules services handle the account, access, and key-release steps for the supported V1 flow.</p>
        </div>

        <dl class="mt-10 grid overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2">
            @foreach ([
                ['Protect images', 'Turn supported image files into protected Capsules that can be published on ordinary web pages.', 'text-teal-700'],
                ['Choose access rules', 'Use open access, date windows, opening limits, revocation, and trust checks depending on how you want the image to be shared.', 'text-brand'],
                ['Use the hosted service', 'You do not need to run your own servers for the supported flow. Share Capsules provides the account, access, and key-release services.', 'text-amber-700'],
                ['Still coming later', 'More content types, more browsers and devices, more provider choices, and more advanced publishing workflows.', 'text-muted'],
            ] as [$term, $description, $color])
                <div class="bg-white p-6 md:p-7">
                    <dt class="font-bold {{ $color }}">{{ $term }}</dt>
                    <dd class="mt-3 text-sm leading-6 text-muted">{{ $description }}</dd>
                </div>
            @endforeach
        </dl>
    </div>
</section>
