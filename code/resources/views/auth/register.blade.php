@extends('layouts.auth')

@section('title', 'Create your account — Share Capsules')
@section('description', 'Create a Share Capsules account.')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">One account, both roles</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Create your account</h1>
    <p class="mt-3 text-sm leading-6 text-muted">Use the same account to create Capsules and open protected work.</p>

    <form class="mt-8 space-y-5" method="POST" action="{{ route('register.store') }}">
        @csrf

        <x-forms.input label="Email address" name="email" type="email" autocomplete="email" required autofocus />
        <x-forms.input label="Password" name="password" type="password" autocomplete="new-password" required />
        <x-forms.input label="Confirm password" name="password_confirmation" type="password" autocomplete="new-password" required />

        <p class="-mt-2 text-xs leading-5 text-muted">Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</p>

        <div>
            <label class="flex items-start gap-3 text-sm leading-6 text-muted">
                <input class="mt-1 size-4 rounded border-line text-brand focus:ring-brand" name="terms" type="checkbox" value="1" @checked(old('terms'))>
                <span>I accept the current <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('terms') }}" target="_blank">account terms</a> and <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('privacy') }}" target="_blank">privacy notice</a>.</span>
            </label>
            @error('terms')
                <p class="mt-2 text-sm text-red-700">{{ $message }}</p>
            @enderror
        </div>

        <x-forms.button type="submit">Create account</x-forms.button>
    </form>

    <p class="mt-6 text-center text-sm text-muted">Already have an account? <a class="font-semibold text-brand hover:text-brand-strong" href="{{ route('login') }}">Sign in</a></p>
@endsection
