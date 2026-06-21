<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="scroll-smooth">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="@yield('description', 'Creator-controlled encrypted content with explicit trust policies.')">
        <meta name="theme-color" content="#f6f8fc">

        <title>@yield('title', config('app.name', 'Share Capsules'))</title>

        @fonts

        @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
            @vite(['resources/css/app.css', 'resources/js/app.js'])
        @endif
    </head>
    <body class="min-h-screen bg-canvas text-ink antialiased">
        <a
            href="#main-content"
            class="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
        >
            Skip to content
        </a>

        <div class="relative isolate min-h-screen overflow-hidden">
            <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_75%_10%,rgba(37,99,235,0.10),transparent_35%),radial-gradient(circle_at_15%_5%,rgba(13,148,136,0.08),transparent_30%)]"></div>

            <header class="border-b border-line/80 bg-white/80 backdrop-blur-xl">
                <div class="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
                    <a href="{{ route('home') }}" class="group inline-flex items-center gap-3" aria-label="Share Capsules home">
                        <span class="relative grid size-9 place-items-center rounded-xl bg-brand text-white shadow-sm shadow-brand/20 transition-transform group-hover:-translate-y-0.5">
                            <span class="h-4 w-2.5 rounded-[0.3rem] border-2 border-current border-r-0" aria-hidden="true"></span>
                        </span>
                        <span class="text-[0.82rem] leading-[0.95rem] font-bold tracking-[0.16em] uppercase">
                            Share<br>Capsules
                        </span>
                    </a>

                    <nav class="hidden items-center gap-8 text-sm font-medium text-muted lg:flex" aria-label="Primary navigation">
                        <a class="transition-colors hover:text-ink" href="{{ route('home') }}#problem">The problem</a>
                        <a class="transition-colors hover:text-ink" href="{{ route('how-it-works') }}">How it works</a>
                        <a class="transition-colors hover:text-ink" href="{{ route('home') }}#trust">How trust works</a>
                        <a class="transition-colors hover:text-ink" href="{{ route('technical') }}">Technical overview</a>
                    </nav>

                    <div class="flex items-center gap-2 sm:gap-3">
                        <a class="hidden text-xs font-semibold text-muted hover:text-ink sm:inline" href="{{ route('home') }}#project-status">Experimental V1</a>
                        @auth
                            <a
                                href="{{ route('dashboard') }}"
                                class="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/30 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                                Account
                            </a>
                        @else
                            <a
                                href="{{ route('login') }}"
                                class="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm transition hover:border-brand/30 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                                Sign in
                            </a>
                        @endauth
                    </div>
                </div>
            </header>

            <main id="main-content">
                @yield('content')
            </main>

            <footer class="border-t border-line bg-white">
                <div class="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-muted sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
                    <div>
                        <p class="font-semibold text-ink">Share Capsules</p>
                        <p class="mt-1">An open experimental implementation of Capsule and CTX.</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('how-it-works') }}">How it works</a>
                        <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('technical') }}">Technical overview</a>
                        <span>
                            Sponsored by
                            <a class="font-semibold text-brand hover:text-brand-strong" href="https://tekfoundry.com" rel="noreferrer">TekFoundry</a>
                        </span>
                        <a class="font-semibold text-brand hover:text-brand-strong" href="mailto:info@tekfoundry.com">info@tekfoundry.com</a>
                    </div>
                </div>
            </footer>
        </div>
    </body>
</html>
