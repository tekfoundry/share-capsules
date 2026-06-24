@extends('layouts.app')

@section('title', 'Install the Share Capsules Viewer extension')
@section('description', 'Install or enable the Share Capsules Viewer extension so protected Capsules can be verified, authorized, and opened locally.')
@section('robots', 'index, follow')

@section('content')
    <section class="mx-auto max-w-5xl px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:px-10">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Viewer setup</p>
        <h1 class="mt-5 max-w-4xl text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">Install or enable the Share Capsules Viewer.</h1>
        <p class="mt-7 max-w-3xl text-lg leading-8 text-muted">Protected Capsules open through the browser extension. The extension verifies the signed Capsule, asks Share Capsules for authorization, and decrypts locally only after access is approved.</p>

        <div class="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article class="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
                <h2 class="text-2xl font-semibold tracking-[-0.025em] text-ink">What to do next</h2>
                <ol class="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted">
                    <li>Install the official Share Capsules Viewer extension for your browser. The public store listing will be linked here when the V1 extension is published.</li>
                    <li>Return to the page that contains the Capsule.</li>
                    <li>Allow the extension on that site if your browser asks.</li>
                    <li>Connect your Share Capsules account when the Viewer asks. Your password stays on the Share Capsules sign-in page and is not given to the extension.</li>
                </ol>

                @if ($returnTo !== null)
                    <a
                        href="{{ $returnTo }}"
                        class="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm shadow-brand/20 transition hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                        Return to the Capsule page
                    </a>
                    <p class="mt-3 text-xs leading-5 text-muted">This return link is ordinary page navigation. It does not contain account credentials, authorization tickets, content keys, recovery material, or other protected opening data.</p>
                @else
                    <p class="mt-7 rounded-xl border border-line bg-canvas p-4 text-sm leading-6 text-muted">After installing or enabling the extension, go back to the website where you found the Capsule and reload the page.</p>
                @endif
            </article>

            <aside class="rounded-2xl border border-line bg-canvas p-6 sm:p-8">
                <h2 class="text-xl font-semibold tracking-[-0.025em] text-ink">What this page does not do</h2>
                <ul class="mt-5 list-disc space-y-3 pl-5 text-sm leading-6 text-muted">
                    <li>It does not receive Capsule content or decrypted pixels.</li>
                    <li>It does not receive extension tokens, tickets, proofs, device keys, or content keys.</li>
                    <li>It does not provide a browser-only fallback decryption path.</li>
                </ul>
                <a class="mt-6 inline-flex font-semibold text-brand hover:text-brand-strong" href="{{ route('instructions') }}#capsule-viewing">
                    Read the viewing instructions →
                </a>
            </aside>
        </div>
    </section>
@endsection
