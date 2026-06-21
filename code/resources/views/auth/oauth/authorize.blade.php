@extends('layouts.app')

@section('title', 'Connect Viewer — Share Capsules')
@section('description', 'Approve the Share Capsules Viewer extension connection.')

@section('content')
    <section class="mx-auto max-w-xl px-5 py-16 sm:px-8">
        <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Extension authorization</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Connect the Viewer?</h1>
        <p class="mt-4 leading-7 text-muted"><strong class="text-ink">{{ $client->name }}</strong> is requesting permission to connect to your Share Capsules account.</p>

        <div class="mt-8 rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 class="font-bold">Requested access</h2>
            <ul class="mt-4 space-y-3 text-sm leading-6 text-muted">
                @foreach ($scopes as $scope)
                    <li class="flex gap-3">
                        <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true"></span>
                        {{ $scope->description }}
                    </li>
                @endforeach
            </ul>
            <p class="mt-5 border-t border-line pt-5 text-sm leading-6 text-muted">The extension never receives your password or Share Capsules browser-session cookie. You can deny this request without changing your account.</p>
        </div>

        <div class="mt-8 grid gap-3 sm:grid-cols-2">
            <form method="POST" action="{{ route('passport.authorizations.approve') }}">
                @csrf
                <input type="hidden" name="state" value="{{ $request->state }}">
                <input type="hidden" name="client_id" value="{{ $client->getKey() }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-strong" type="submit">Connect extension</button>
            </form>

            <form method="POST" action="{{ route('passport.authorizations.deny') }}">
                @csrf
                @method('DELETE')
                <input type="hidden" name="state" value="{{ $request->state }}">
                <input type="hidden" name="client_id" value="{{ $client->getKey() }}">
                <input type="hidden" name="auth_token" value="{{ $authToken }}">
                <button class="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-ink shadow-sm hover:border-brand/30 hover:text-brand" type="submit">Deny</button>
            </form>
        </div>
    </section>
@endsection
