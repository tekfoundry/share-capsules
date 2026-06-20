@extends('layouts.auth')

@section('title', 'Reset your password — Share Capsules')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account recovery</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Reset your password</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Enter your email. If it belongs to an account, we’ll send password-reset instructions.</p>

    <x-forms.status class="mt-6" />

    <form class="mt-8 space-y-5" method="POST" action="{{ route('password.email') }}">
        @csrf
        <x-forms.input label="Email address" name="email" type="email" autocomplete="email" required autofocus />
        <x-forms.button type="submit">Send reset link</x-forms.button>
    </form>

    <p class="mt-6 text-center text-sm"><a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('login') }}">Return to sign in</a></p>
@endsection
