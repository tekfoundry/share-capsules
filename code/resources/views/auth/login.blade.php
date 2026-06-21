@extends('layouts.auth')

@section('title', 'Sign in — Share Capsules')
@section('description', 'Sign in to your Share Capsules account.')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Welcome back</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Sign in</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Manage your account and continue building trusted continuity.</p>

    <x-forms.status class="mt-6" />

    <form class="mt-8 space-y-5" method="POST" action="{{ route('login.store') }}">
        @csrf

        <x-forms.input label="Email address" name="email" type="email" autocomplete="email webauthn" required autofocus />
        <x-forms.input label="Password" name="password" type="password" autocomplete="current-password" required />

        <div class="flex items-center justify-between gap-4 text-sm">
            <label class="flex items-center gap-2 text-muted">
                <input class="size-4 rounded border-line text-brand focus:ring-brand" name="remember" type="checkbox" value="1">
                Remember me
            </label>
            <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('password.request') }}">Forgot password?</a>
        </div>

        <x-forms.button type="submit">Sign in</x-forms.button>
    </form>

    <div class="my-6 flex items-center gap-3 text-xs font-semibold tracking-wide text-muted uppercase" aria-hidden="true">
        <span class="h-px flex-1 bg-line"></span>
        or
        <span class="h-px flex-1 bg-line"></span>
    </div>

    <div data-passkey-container>
        <button class="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm transition hover:border-brand/30 hover:text-brand disabled:cursor-not-allowed disabled:opacity-60" type="button" data-passkey-login>
            Sign in with a passkey
        </button>
        <p class="mt-2 hidden text-sm leading-6 text-muted" role="status" data-passkey-status></p>
    </div>

    <p class="mt-6 text-center text-sm text-muted">New to Share Capsules? <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('register') }}">Create an account</a></p>
@endsection
