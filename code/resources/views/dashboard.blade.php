@extends('layouts.account')

@section('title', 'Dashboard — Share Capsules')

@section('account-content')
    <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Dashboard</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Welcome back</h1>
            <p class="mt-3 text-muted">Create protected work, manage existing Capsules, and review your account security.</p>
        </div>
        <a class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-strong" href="{{ route('studio.capsules.create') }}">New Capsule</a>
    </header>

    @if (request()->boolean('verified'))
        <div role="status" class="mt-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">Your email address is verified.</div>
    @endif

    <section class="mt-8 grid gap-5 sm:grid-cols-2" aria-label="Account overview">
        <a class="rounded-2xl border border-line bg-white p-6 shadow-card transition hover:border-brand/30" href="{{ route('studio.capsules.index') }}">
            <p class="text-sm font-semibold text-muted">Capsules</p>
            <p class="mt-2 text-3xl font-bold text-ink">{{ number_format($capsuleCount) }}</p>
            <p class="mt-2 text-sm text-muted">{{ number_format($activeCapsuleCount) }} currently active</p>
            <p class="mt-5 text-sm font-bold text-brand">Manage Capsules →</p>
        </a>

        <a class="rounded-2xl border border-line bg-white p-6 shadow-card transition hover:border-brand/30" href="{{ route('account.security') }}">
            <p class="text-sm font-semibold text-muted">Account</p>
            <p class="mt-2 text-xl font-bold text-ink">Email verified</p>
            <p class="mt-2 truncate text-sm text-muted">{{ auth()->user()->email }}</p>
            <p class="mt-5 text-sm font-bold text-brand">Review security →</p>
        </a>
    </section>

@endsection
