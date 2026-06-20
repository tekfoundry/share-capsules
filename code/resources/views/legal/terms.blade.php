@extends('layouts.app')

@section('title', 'Account terms — Share Capsules')

@section('content')
    <article class="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Version {{ config('accounts.terms.version') }}</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-[-0.035em] text-ink">Account terms</h1>
        <div class="mt-8 space-y-5 leading-7 text-muted">
            <p>Share Capsules is experimental software under active development. Do not rely on it yet to protect sensitive or irreplaceable content.</p>
            <p>You are responsible for your account credentials, content, hosting choices, and compliance with laws and third-party rights. Do not use the service to distribute unlawful or harmful material or to interfere with the service or other users.</p>
            <p>Capsule and CTX reduce specific access risks; they cannot prevent screenshots, external capture, authorized-user misuse, or modified client software.</p>
            <p>Questions about these working terms may be sent to <a class="font-semibold text-brand" href="mailto:info@tekfoundry.com">info@tekfoundry.com</a>.</p>
        </div>
    </article>
@endsection
