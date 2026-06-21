@extends('layouts.auth')

@section('title', 'Confirm account restoration — Share Capsules')
@section('description', 'Confirm restoration of a closed Share Capsules account.')

@section('auth-content')
    <p class="text-xs font-bold tracking-[0.16em] text-brand uppercase">Recovery link verified</p>
    <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Restore your account?</h1>
    <p class="mt-3 text-sm leading-6 text-muted">The account is scheduled for permanent deletion {{ $deletionDueAt->diffForHumans() }}. Restoration cancels that pending deletion.</p>

    <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        Old sessions and OAuth tokens remain revoked. Viewer devices remain suspended until you sign in, review them, and deliberately reactivate them.
    </div>

    <div class="mt-6 space-y-3">
        <form method="POST" action="{{ $restoreUrl }}">
            @csrf
            <x-forms.button type="submit">Restore account</x-forms.button>
        </form>
        <a class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-brand shadow-sm hover:border-brand/30" href="{{ $inventoryUrl }}">Download Capsule inventory</a>
    </div>
@endsection
