@extends('layouts.account')

@section('title', 'Close account — Share Capsules')
@section('description', 'Review and begin the Share Capsules account closure process.')

@section('account-content')
    <section>
        <a class="text-sm font-semibold text-brand hover:text-brand-strong" href="{{ route('account.security') }}">← Back to account security</a>

        <div class="mt-6 rounded-2xl border border-red-200 bg-white p-6 shadow-card sm:p-8">
            <p class="text-xs font-bold tracking-[0.16em] text-red-700 uppercase">Account closure</p>
            <h1 class="mt-3 text-3xl font-semibold tracking-[-0.035em]">Close your Share Capsules account</h1>
            <p class="mt-3 leading-7 text-muted">Closure immediately signs you out everywhere, suspends Viewer devices, revokes extension credentials, and pauses future protected access.</p>

            <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                You have {{ $recoveryDays }} days to restore the account using a link sent to your verified email. Restoration does not revive old sessions or tokens. If the recovery period expires, the separate permanent-deletion process will remove eligible account data.
            </div>

            <div class="mt-6 rounded-xl border border-line bg-slate-50 p-4">
                <p class="font-semibold text-ink">Capsule inventory</p>
                <p class="mt-1 text-sm leading-6 text-muted">This account currently has {{ $capsuleCount }} registered {{ Str::plural('Capsule', $capsuleCount) }}. Download the versioned inventory before closing; the recovery page offers it again during the recovery period.</p>
                <a class="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-brand shadow-sm hover:border-brand/30" href="{{ route('account.closure.inventory') }}">Download Capsule inventory</a>
            </div>

            <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p class="font-semibold">Capsule access impact</p>
                <p class="mt-1">Closing your account pauses access during the recovery period. Permanent deletion destroys the broker-held content keys, so these Capsules can no longer be opened. Keep your downloaded Capsule files and signing-key recovery kit separately.</p>
            </div>

            <form class="mt-8" method="POST" action="{{ route('account.closure.store') }}" data-confirm data-confirm-title="Close your account?" data-confirm-message="Access will stop immediately, all sessions will be signed out, and permanent deletion will follow after the recovery period unless you restore the account." data-confirm-action="Close account">
                @csrf
                <label class="flex items-start gap-3 text-sm leading-6 text-ink">
                    <input class="mt-1 size-4 rounded border-line text-red-700 focus:ring-red-600" name="acknowledge" type="checkbox" value="1" required>
                    <span>I understand that access stops immediately and permanent deletion follows if I do not restore the account within {{ $recoveryDays }} days.</span>
                </label>
                @error('acknowledge')
                    <p class="mt-2 text-sm text-red-700" role="alert">{{ $message }}</p>
                @enderror

                <button class="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-red-800" type="submit">Close account</button>
            </form>
        </div>
    </section>
@endsection
