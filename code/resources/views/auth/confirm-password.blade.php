@extends('layouts.auth')

@section('title', 'Confirm your identity — Share Capsules')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Sensitive account action</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Confirm your identity</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Confirm with your password or an enrolled passkey before managing account authenticators.</p>

    <form class="mt-8 space-y-5" method="POST" action="{{ route('password.confirm.store') }}">
        @csrf
        <x-forms.input label="Current password" name="password" type="password" autocomplete="current-password" required autofocus />
        <x-forms.button type="submit">Confirm with password</x-forms.button>
    </form>

    @if (auth()->user()->hasPasskeysEnabled())
        <div class="my-6 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase" aria-hidden="true">
            <span class="h-px flex-1 bg-line"></span>
            or
            <span class="h-px flex-1 bg-line"></span>
        </div>

        <div data-passkey-container>
            <button class="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-brand/30 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" type="button" data-passkey-confirm>
                Confirm with a passkey
            </button>
            <p class="mt-2 hidden text-sm leading-6 text-muted" role="status" data-passkey-status></p>
        </div>
    @endif
@endsection
