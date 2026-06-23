@extends('layouts.app')

@section('content')
    <div class="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-10 lg:py-14">
        <aside>
            <div class="rounded-2xl border border-line bg-white p-4 shadow-card lg:sticky lg:top-6">
                <div class="border-b border-line px-2 pb-4">
                    <p class="text-xs font-bold tracking-[0.14em] text-brand uppercase">Share Capsules</p>
                    <p class="mt-1 truncate text-sm text-muted">{{ auth()->user()->email }}</p>
                </div>

                <nav class="mt-3 grid gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Account navigation">
                    <a
                        href="{{ route('dashboard') }}"
                        @class([
                            'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                            'bg-brand text-white' => request()->routeIs('dashboard'),
                            'text-muted hover:bg-surface hover:text-ink' => ! request()->routeIs('dashboard'),
                        ])
                        @if (request()->routeIs('dashboard')) aria-current="page" @endif
                    >Dashboard</a>
                    <a
                        href="{{ route('studio.capsules.index') }}"
                        @class([
                            'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                            'bg-brand text-white' => request()->routeIs('studio.capsules.*'),
                            'text-muted hover:bg-surface hover:text-ink' => ! request()->routeIs('studio.capsules.*'),
                        ])
                        @if (request()->routeIs('studio.capsules.*')) aria-current="page" @endif
                    >Capsules</a>
                    <a
                        href="{{ route('account.security') }}"
                        @class([
                            'rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                            'bg-brand text-white' => request()->routeIs('account.*'),
                            'text-muted hover:bg-surface hover:text-ink' => ! request()->routeIs('account.*'),
                        ])
                        @if (request()->routeIs('account.*')) aria-current="page" @endif
                    >Account</a>
                </nav>

                <form class="mt-3 border-t border-line pt-3" method="POST" action="{{ route('logout') }}">
                    @csrf
                    <button class="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink" type="submit">Sign out</button>
                </form>
            </div>
        </aside>

        <div class="min-w-0">
            @yield('account-content')
        </div>
    </div>
@endsection
