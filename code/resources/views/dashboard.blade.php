@extends('layouts.app')

@section('title', 'Your account — Share Capsules')

@section('content')
    <section class="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:px-10">
        @if (request()->boolean('verified'))
            <div role="status" class="mb-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">Your email address is verified.</div>
        @endif

        <div class="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
            <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account foundation</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Your Share Capsules account</h1>
            <p class="mt-3 text-muted">Signed in as {{ auth()->user()->email }}</p>

            <div class="mt-8 rounded-xl border border-teal-200 bg-teal-50 p-4">
                <p class="font-semibold text-teal-950">Email verified</p>
                <p class="mt-1 text-sm leading-6 text-teal-900/75">This account can proceed to future device registration and Capsule workflows.</p>
            </div>

            <div class="mt-8 flex flex-wrap gap-3">
                <a class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-strong" href="{{ route('account.security') }}">Account security</a>
                <form method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:border-brand/30 hover:text-brand" type="submit">Sign out</button>
                </form>
            </div>
        </div>
    </section>
@endsection
