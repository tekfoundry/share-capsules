@extends('layouts.app')

@section('title', 'Phase 12 Capsule Test - Share Capsules')
@section('description', 'Production acceptance test page for a Share Capsules encrypted Capsule.')

@php
    $capsuleUrl = asset('capsules/phase12/tekfoundry-logo.capsule');
    $installUrl = route('viewer.install', ['return_to' => url()->current()]);
@endphp

@section('content')
    <section class="mx-auto max-w-4xl px-5 py-14 sm:px-8 lg:px-10">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Phase 12 Test</p>
        <h1 class="mt-3 text-4xl font-bold text-ink sm:text-5xl">TekFoundry Logo Capsule</h1>
        <p class="mt-4 max-w-2xl text-base leading-7 text-muted">This public page hosts a production-created Capsule for the clean-account viewer acceptance check.</p>

        <div class="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
            <capsule-viewer
                src="{{ $capsuleUrl }}"
                fit="contain"
                viewer-height="320px"
            >
                <fallback>
                    <div class="rounded-xl border border-line bg-surface p-6">
                        <h2 class="text-xl font-semibold text-ink">Protected TekFoundry logo</h2>
                        <p class="mt-3 text-sm leading-6 text-muted">Install or enable the Share Capsules Viewer to open this Capsule.</p>
                        <a class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-strong" href="{{ $installUrl }}">
                            Install the Viewer
                        </a>
                    </div>
                </fallback>

                <template>
                    <figure class="overflow-hidden rounded-xl border border-line bg-surface p-4">
                        <content class="block w-full rounded-lg bg-white" style="height: 320px;"></content>
                        <figcaption class="mt-3 text-sm font-semibold text-muted">@{{ title }}</figcaption>
                    </figure>
                </template>

                <error>
                    <div class="rounded-xl border border-red-200 bg-red-50 p-6">
                        <h2 class="text-xl font-semibold text-red-950">Capsule unavailable</h2>
                        <p class="mt-3 text-sm leading-6 text-red-900">@{{ error_message }}</p>
                    </div>
                </error>
            </capsule-viewer>
        </div>

        <dl class="mt-6 grid gap-4 rounded-2xl border border-line bg-white p-5 text-sm sm:grid-cols-2 sm:p-6">
            <div>
                <dt class="font-semibold text-ink">Test page</dt>
                <dd class="mt-1 break-all text-muted">{{ url()->current() }}</dd>
            </div>
            <div>
                <dt class="font-semibold text-ink">Capsule URL</dt>
                <dd class="mt-1 break-all text-muted">{{ $capsuleUrl }}</dd>
            </div>
        </dl>
    </section>
@endsection
