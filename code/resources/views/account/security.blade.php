@extends('layouts.app')

@section('title', 'Account security — Share Capsules')
@section('description', 'Inspect and revoke active Share Capsules browser sessions.')

@section('content')
    <section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-10">
        <a class="text-sm font-semibold text-brand hover:text-brand-strong" href="{{ route('dashboard') }}">← Back to account</a>

        <div class="mt-6">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account security</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Active browser sessions</h1>
            <p class="mt-3 max-w-2xl leading-7 text-muted">Review where your account is signed in. Revoking a session also invalidates existing persistent-login cookies so it cannot silently return.</p>
        </div>

        <div class="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
                <h2 class="font-bold text-ink">Passkeys</h2>
                <p class="mt-1 text-sm leading-6 text-muted">Enroll multiple phishing-resistant authenticators and revoke ones you no longer use.</p>
            </div>
            <a class="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand shadow-sm hover:border-brand/30 sm:mt-0" href="{{ route('account.passkeys') }}">Manage passkeys</a>
        </div>

        <div class="mt-4 rounded-2xl border border-line bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
                <h2 class="font-bold text-ink">Viewer devices</h2>
                <p class="mt-1 text-sm leading-6 text-muted">Inspect, rename, suspend, or permanently revoke browser-extension installations.</p>
            </div>
            <a class="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand shadow-sm hover:border-brand/30 sm:mt-0" href="{{ route('account.devices.index') }}">Manage devices</a>
        </div>

        @if (session('status'))
            <div role="status" class="mt-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{{ session('status') }}</div>
        @endif

        @error('session')
            <div role="alert" class="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{{ $message }}</div>
        @enderror

        <div class="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            @forelse ($sessions as $session)
                <article class="flex flex-col gap-5 border-b border-line p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div class="flex min-w-0 gap-4">
                        <div class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg text-slate-600" aria-hidden="true">◫</div>
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h2 class="font-bold text-ink">{{ $session->browserLabel() }} on {{ $session->platformLabel() }}</h2>
                                @if ($session->isCurrent)
                                    <span class="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800">Current session</span>
                                @endif
                            </div>
                            <p class="mt-1 text-sm text-muted">
                                {{ $session->ipAddress ?? 'IP unavailable' }}
                                <span aria-hidden="true">·</span>
                                Active {{ $session->lastActivityAt->diffForHumans() }}
                            </p>
                        </div>
                    </div>

                    @unless ($session->isCurrent)
                        <form method="POST" action="{{ route('account.sessions.destroy', $session->id) }}">
                            @csrf
                            @method('DELETE')
                            <button class="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50" type="submit">Revoke</button>
                        </form>
                    @endunless
                </article>
            @empty
                <div class="p-6 text-sm leading-6 text-muted">No active database sessions were found. Refresh this page after signing in again if the session store was recently changed.</div>
            @endforelse
        </div>

        <div class="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 class="text-lg font-bold">Sign out everywhere else</h2>
            <p class="mt-2 text-sm leading-6 text-muted">Enter your password to revoke every other browser session. Your current session remains active.</p>

            <form class="mt-5 max-w-md space-y-4" method="POST" action="{{ route('account.sessions.destroy-others') }}">
                @csrf
                @method('DELETE')
                <x-forms.input label="Current password" name="password" type="password" autocomplete="current-password" required />
                <button class="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-red-800" type="submit">Revoke other sessions</button>
            </form>
        </div>

        <div class="mt-10 rounded-2xl border border-red-200 bg-white p-6 shadow-card">
            <h2 class="text-lg font-bold text-red-800">Close account</h2>
            <p class="mt-2 text-sm leading-6 text-muted">Immediately stop account access and begin the 30-day recovery period that precedes permanent deletion.</p>
            <a class="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 shadow-sm hover:bg-red-50" href="{{ route('account.closure.show') }}">Review account closure</a>
        </div>
    </section>
@endsection
