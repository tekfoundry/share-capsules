@extends('layouts.app')

@section('title', 'Privacy notice — Share Capsules')

@section('content')
    <article class="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Version {{ config('accounts.terms.version') }}</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-[-0.035em] text-ink">Privacy notice</h1>
        <div class="mt-8 space-y-5 leading-7 text-muted">
            <p>The initial account flow collects your email address, securely hashed password, acceptance timestamp and terms version, authentication sessions, and security events needed to operate and protect the account. Browser sessions include an IP address, user agent, and last-activity time so you can inspect and revoke them.</p>
            <p>Your email address and raw account history are not disclosed to Capsule creators or Host websites. Future optional trust evidence will require explicit disclosure and consent as described by the Share Capsules design documents.</p>
            <p>Email verification proves control of an address. It does not prove identity, personhood, or trustworthiness.</p>
            <p>Privacy questions may be sent to <a class="font-semibold text-brand" href="mailto:info@tekfoundry.com">info@tekfoundry.com</a>.</p>
        </div>
    </article>
@endsection
