<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>{{ config('app.name', 'Share Capsules') }}</title>

        @fonts

        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    </head>
    <body class="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <main class="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16 lg:px-8">
            <section class="max-w-3xl">
                <p class="mb-5 text-sm font-semibold tracking-[0.22em] text-cyan-300 uppercase">
                    Experimental reference implementation
                </p>

                <h1 class="text-5xl font-semibold tracking-tight sm:text-7xl">
                    Share Capsules
                </h1>

                <p class="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                    Creator-controlled encrypted content, opened through explicit trust policies using the Capsule Trust Exchange protocol.
                </p>

                <div class="mt-10 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
                    This project is under active development. It must not yet be relied upon to protect sensitive or irreplaceable content.
                </div>

                <div class="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
                    <span>Sponsored by <a class="text-cyan-300 hover:text-cyan-200" href="https://tekfoundry.com">TekFoundry</a></span>
                    <a class="text-cyan-300 hover:text-cyan-200" href="mailto:info@tekfoundry.com">info@tekfoundry.com</a>
                </div>
            </section>
        </main>
    </body>
</html>
