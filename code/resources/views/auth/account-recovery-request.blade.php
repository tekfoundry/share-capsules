@extends('layouts.auth')

@section('title', 'Restore account — Share Capsules')
@section('description', 'Request a Share Capsules account restoration link.')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account recovery</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Restore a closed account</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Enter the verified email address. If the account is still within its recovery period, we will send a new restoration link.</p>

    <x-forms.status class="mt-6" />

    <form class="mt-8 space-y-5" method="POST" action="{{ route('account.restore.send') }}">
        @csrf
        <x-forms.input label="Email address" name="email" type="email" autocomplete="email" required autofocus />
        <x-forms.button type="submit">Send recovery link</x-forms.button>
    </form>

    <p class="mt-6 text-center text-sm text-muted"><a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('login') }}">Return to sign in</a></p>
@endsection
