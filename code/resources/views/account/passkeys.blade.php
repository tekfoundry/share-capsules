@extends('layouts.app')

@section('title', 'Passkeys — Share Capsules')
@section('description', 'Enroll and revoke passkeys for your Share Capsules account.')

@section('content')
    <section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-10">
        <a class="text-sm font-semibold text-brand hover:text-brand-strong" href="{{ route('account.security') }}">← Back to account security</a>

        <div class="mt-6">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account authenticators</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Passkeys</h1>
            <p class="mt-3 max-w-2xl leading-7 text-muted">Passkeys use your device, password manager, or security key for phishing-resistant authentication. They secure this account but do not prove identity, personhood, or trustworthiness.</p>
        </div>

        @if (session('status') === 'passkey-deleted')
            <div role="status" class="mt-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">Passkey revoked.</div>
        @endif

        <div class="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            @forelse ($passkeys as $passkey)
                <article class="flex flex-col gap-5 border-b border-line p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div>
                        <h2 class="font-bold text-ink">{{ $passkey->name }}</h2>
                        <p class="mt-1 text-sm text-muted">
                            {{ $passkey->authenticator ?? 'Passkey authenticator' }}
                            <span aria-hidden="true">·</span>
                            Added {{ $passkey->created_at->diffForHumans() }}
                            @if ($passkey->last_used_at)
                                <span aria-hidden="true">·</span>
                                Last used {{ $passkey->last_used_at->diffForHumans() }}
                            @endif
                        </p>
                    </div>

                    <form method="POST" action="{{ route('passkey.destroy', $passkey) }}">
                        @csrf
                        @method('DELETE')
                        <button class="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50" type="submit">Revoke</button>
                    </form>
                </article>
            @empty
                <div class="p-6 text-sm leading-6 text-muted">No passkeys are enrolled yet. Your password remains available as the recovery authenticator.</div>
            @endforelse
        </div>

        <div class="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card" data-passkey-container>
            <h2 class="text-lg font-bold">Add a passkey</h2>
            <p class="mt-2 text-sm leading-6 text-muted">Give it a recognizable name so you can revoke the right authenticator later.</p>

            <form class="mt-5 max-w-md space-y-4" data-passkey-register>
                <x-forms.input label="Passkey name" name="passkey_name" autocomplete="off" placeholder="Personal MacBook" required />
                <button class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-sm hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60" type="submit">Add passkey</button>
            </form>
            <p class="mt-3 hidden text-sm leading-6 text-muted" role="status" data-passkey-status></p>
        </div>
    </section>
@endsection
