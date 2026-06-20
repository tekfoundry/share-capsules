@extends('layouts.auth')

@section('title', 'Choose a new password — Share Capsules')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Account recovery</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Choose a new password</h1>

    <form class="mt-8 space-y-5" method="POST" action="{{ route('password.store') }}">
        @csrf
        <input type="hidden" name="token" value="{{ $token }}">

        <x-forms.input label="Email address" name="email" type="email" autocomplete="email" :value="old('email', $request->email)" required autofocus />
        <x-forms.input label="New password" name="password" type="password" autocomplete="new-password" required />
        <x-forms.input label="Confirm new password" name="password_confirmation" type="password" autocomplete="new-password" required />
        <x-forms.button type="submit">Set new password</x-forms.button>
    </form>
@endsection
