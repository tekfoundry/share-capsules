<button
    {{ $attributes->class('inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/15 transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60') }}
>
    {{ $slot }}
</button>
