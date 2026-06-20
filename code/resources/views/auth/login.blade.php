@extends('layouts.auth')

@section('title', 'Sign in — Share Capsules')
@section('description', 'Sign in to your Share Capsules account.')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Welcome back</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Sign in</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Manage your account and continue building trusted continuity.</p>

    <x-forms.status class="mt-6" />

    <form class="mt-8 space-y-5" method="POST" action="{{ route('login') }}">
        @csrf

        <x-forms.input label="Email address" name="email" type="email" autocomplete="email" required autofocus />
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

    <p class="mt-6 text-center text-sm text-muted">New to Share Capsules? <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('register') }}">Create an account</a></p>
@endsection
