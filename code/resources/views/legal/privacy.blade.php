@extends('layouts.app')

@section('title', 'Privacy notice — Share Capsules')
@section('description', 'How the experimental Share Capsules reference implementation handles account, session, and trust-related information.')
@section('robots', 'index, follow')

@section('content')
    <article class="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Version {{ config('accounts.terms.version') }}</p>
        <h1 class="mt-3 text-4xl font-semibold tracking-[-0.035em] text-ink">Privacy notice</h1>
        <div class="mt-8 space-y-5 leading-7 text-muted">
            <p>The initial account flow collects your email address, securely hashed password, acceptance timestamp and terms version, authentication sessions, and security events needed to operate and protect the account. Browser sessions include an IP address, user agent, and last-activity time so you can inspect and revoke them.</p>
            <p>Your email address and raw account history are not disclosed to Capsule creators or Host websites. Future optional trust evidence will require explicit disclosure and consent as described by the Share Capsules design documents.</p>
            <p>Trust Capsules may ask eligible viewers to complete quick human challenges when recent usage history is not enough to evaluate automated access risk. The service uses bounded derived results, such as a challenge score, challenge timing, selected module identifiers, and short-lived audit state needed to resume or reject the Capsule opening.</p>
            <p>Challenge results are temporary access evidence, not identity records. They do not prove legal identity, unique personhood, or good intent, and they must not include Capsule plaintext, secrets, raw pointer traces kept longer than needed, complete session replay, or unnecessary biometric-style data.</p>
            <p>Capsule creators and Host websites do not receive raw challenge telemetry, raw trust scores, interaction traces, or your underlying usage history. They may receive only privacy-safe viewing outcomes or aggregate operational categories, such as opened, locked by policy, quick check required, automation risk high, or service unavailable.</p>
            <p>Email verification proves control of an address. It does not prove identity, personhood, or trustworthiness.</p>
            <p>Privacy questions may be sent to <a class="font-semibold text-brand" href="mailto:info@tekfoundry.com">info@tekfoundry.com</a>.</p>
        </div>
    </article>
@endsection
