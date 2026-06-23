@extends('layouts.account')

@section('title', 'Your Capsules — Share Capsules')
@section('description', 'Inspect and manage your registered Capsules.')

@section('account-content')
    <div class="space-y-6">
        <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p class="text-sm font-semibold text-brand">Creator Studio</p>
                <h1 class="mt-2 text-3xl font-bold text-ink">Your Capsules</h1>
                <p class="mt-3 max-w-3xl text-muted">This inventory lists Capsule revisions whose content keys were successfully registered. Share Capsules stores the identifiers and operational records below—not your original file or decrypted content.</p>
            </div>
            <a class="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-sm hover:bg-brand-strong" href="{{ route('studio.capsules.create') }}">New Capsule</a>
        </header>

        @if (session('status'))
            <p class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{{ session('status') }}</p>
        @endif

        <section class="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h2 class="text-xl font-bold text-ink">Account deletion impact</h2>
            <p class="mt-2 text-sm leading-6 text-muted">Closing your account pauses access during the recovery period. Permanent deletion destroys the broker-held content keys, so these Capsules can no longer be opened. Keep your downloaded Capsule files and signing-key recovery kit separately.</p>
        </section>

        @forelse ($capsules as $capsule)
            <article class="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p class="text-sm font-semibold uppercase tracking-wide {{ $capsule['status'] === 'active' ? 'text-emerald-700' : ($capsule['status'] === 'revocation_pending' ? 'text-amber-700' : 'text-red-700') }}">{{ str($capsule['status'])->replace('_', ' ') }}</p>
                        <div class="mt-1 flex items-start gap-2">
                            <h2 class="text-xl font-bold text-ink">{{ $capsule['display_name'] }}</h2>
                            <details class="group relative shrink-0">
                                <summary class="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden" title="Edit the name shown in your account">
                                    <svg aria-hidden="true" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                    </svg>
                                    <span class="sr-only">Edit the name shown in your account</span>
                                </summary>
                                <div class="absolute right-0 z-10 mt-2 w-[min(22rem,calc(100vw-4rem))] rounded-xl border border-line bg-white p-4 shadow-lg">
                                    <p class="font-semibold text-ink">Edit account label</p>
                                    <p class="mt-1 text-sm leading-5 text-muted">This changes only the name shown in your account. The signed Capsule file is unchanged.</p>
                                    <form class="mt-3 grid gap-3" method="POST" action="{{ route('studio.capsules.label', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}">
                                        @csrf
                                        @method('PATCH')
                                        <label class="sr-only" for="management-label-{{ $loop->index }}">Name shown in your account</label>
                                        <input id="management-label-{{ $loop->index }}" class="min-h-11 rounded-xl border border-line px-3 text-ink" name="management_label" maxlength="200" value="{{ $capsule['management_label'] ?? '' }}" placeholder="{{ $capsule['title'] ?? 'Enter a recognizable name' }}">
                                        <button class="min-h-11 rounded-xl bg-brand px-4 font-bold text-white" type="submit">Save name</button>
                                    </form>
                                </div>
                            </details>
                        </div>
                        <p class="mt-2 flex flex-wrap gap-2 text-sm text-muted">
                            <span class="rounded-full bg-surface px-3 py-1 font-semibold text-ink">{{ $capsule['content_type'] }}{{ $capsule['media_format'] === null ? '' : ' · '.$capsule['media_format'] }}</span>
                            <span class="px-1 py-1">Revision {{ $capsule['capsule_revision'] }}</span>
                        </p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-ink">{{ number_format($capsule['committed_releases']) }}</p>
                        <p class="text-sm text-muted">completed openings</p>
                    </div>
                </div>
                <dl class="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
                    <div><dt class="font-semibold text-ink">Registered</dt><dd class="mt-1 text-muted">{{ $capsule['registered_at'] ?? 'Registration time unavailable' }}</dd></div>
                    <div><dt class="font-semibold text-ink">Total opening limit</dt><dd class="mt-1 text-muted">{{ $capsule['policy']['capsule_lifetime_limit'] === null ? 'Unlimited' : number_format($capsule['policy']['capsule_lifetime_limit']) }}</dd></div>
                    <div><dt class="font-semibold text-ink">Per-user opening limit</dt><dd class="mt-1 text-muted">{{ $capsule['policy']['account_capsule_lifetime_limit'] === null ? 'Unlimited' : number_format($capsule['policy']['account_capsule_lifetime_limit']) }}</dd></div>
                    <div><dt class="font-semibold text-ink">Available from</dt><dd class="mt-1 text-muted">{{ $capsule['policy']['not_before'] ?? 'Any time' }}</dd></div>
                    <div><dt class="font-semibold text-ink">Available until</dt><dd class="mt-1 text-muted">{{ $capsule['policy']['not_after'] ?? 'No end date' }}</dd></div>
                </dl>
                <details class="mt-5 border-t border-line pt-5 text-sm">
                    <summary class="cursor-pointer font-semibold text-brand">Technical details</summary>
                    <dl class="mt-4 grid gap-4 sm:grid-cols-2">
                        <div><dt class="font-semibold text-ink">Capsule identifier</dt><dd class="mt-1 break-all text-muted">{{ $capsule['capsule_id'] }}</dd></div>
                        <div><dt class="font-semibold text-ink">Payload identifier</dt><dd class="mt-1 break-all text-muted">{{ $capsule['payload_id'] }}</dd></div>
                        <div><dt class="font-semibold text-ink">Policy identifier</dt><dd class="mt-1 break-all text-muted">{{ $capsule['policy_sha256'] }}</dd></div>
                        <div><dt class="font-semibold text-ink">Content profile</dt><dd class="mt-1 break-all text-muted">{{ $capsule['content_profile_id'] === null ? 'Unavailable for this record' : $capsule['content_profile_id'].' '.$capsule['content_profile_version'] }}</dd></div>
                    </dl>
                </details>
                <a class="mt-5 inline-flex text-sm font-bold text-brand" href="{{ route('studio.capsules.metrics', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}">View operational metrics →</a>
                @if ($capsule['status'] === 'active')
                    <form class="mt-5 border-t border-line pt-5" method="POST" action="{{ route('studio.capsules.revoke') }}" data-confirm data-confirm-title="Permanently revoke access?" data-confirm-message="This Capsule will stop opening immediately. Revocation cannot be undone, but the Capsule will remain in your account." data-confirm-action="Revoke access">
                        @csrf
                        <input type="hidden" name="capsule_id" value="{{ $capsule['capsule_id'] }}">
                        <input type="hidden" name="capsule_revision" value="{{ $capsule['capsule_revision'] }}">
                        <p class="mb-3 text-sm text-muted">Revocation is permanent. The encrypted file may remain online, but its key will never be released again.</p>
                        <button class="rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50" type="submit">Permanently revoke access</button>
                    </form>
                @endif
                <form class="mt-5 border-t border-line pt-5" method="POST" action="{{ route('studio.capsules.destroy', ['capsuleId' => $capsule['capsule_id'], 'revision' => $capsule['capsule_revision']]) }}" data-confirm data-confirm-title="Delete this Capsule?" data-confirm-message="Its content key will be permanently destroyed and the Capsule will be removed from your account. Downloaded or hosted copies will no longer open." data-confirm-action="Delete Capsule">
                    @csrf
                    @method('DELETE')
                    <p class="mb-3 text-sm text-muted">Deleting permanently destroys the content key and removes this Capsule from your account. Downloaded or hosted copies cannot be removed, but they can no longer be opened.</p>
                    <button class="rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800" type="submit">Delete Capsule</button>
                </form>
            </article>
        @empty
            <div class="rounded-2xl border border-dashed border-line bg-white p-10 text-center">
                <h2 class="text-xl font-bold text-ink">No registered Capsules yet</h2>
                <p class="mt-2 text-muted">A Capsule appears here after its content key is successfully registered.</p>
                <a class="mt-5 inline-flex rounded-xl bg-brand px-5 py-3 font-bold text-white" href="{{ route('studio.capsules.create') }}">Create a Capsule</a>
            </div>
        @endforelse
    </div>
@endsection
