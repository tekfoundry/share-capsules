@extends('layouts.auth')

@section('title', 'Verify your email — Share Capsules')

@section('auth-content')
    <div class="grid size-12 place-items-center rounded-2xl bg-teal-50 text-xl text-teal-700" aria-hidden="true">✉</div>
    <h1 class="mt-5 text-3xl font-semibold tracking-[-0.035em]">Verify your email</h1>
    <p class="mt-3 text-sm leading-6 text-muted">We sent a verification link to <strong class="font-semibold text-ink">{{ auth()->user()->email }}</strong>. Verification is required before creating Capsules, registering devices, or opening protected content.</p>

    @if (session('status') === 'verification-link-sent')
        <div role="status" class="mt-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm leading-6 text-teal-900">A fresh verification link has been sent.</div>
    @endif

    <form class="mt-8" method="POST" action="{{ route('verification.send') }}">
        @csrf
        <x-forms.button type="submit">Resend verification email</x-forms.button>
    </form>

    <form class="mt-4 text-center" method="POST" action="{{ route('logout') }}">
        @csrf
        <button class="text-sm font-semibold text-muted hover:text-ink" type="submit">Sign out</button>
    </form>
@endsection
